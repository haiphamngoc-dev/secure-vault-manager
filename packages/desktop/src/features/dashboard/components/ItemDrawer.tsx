import React, { useState } from "react";
import {
  Box,
  Group,
  Text,
  Title,
  TextInput,
  Textarea,
  Button,
  ActionIcon,
  Menu,
  Badge,
  PasswordInput,
  Tooltip,
  Modal,
  Stack,
  Loader,
  Avatar,
  FileButton,
} from "@mantine/core";
import {
  IconX,
  IconTrash,
  IconPlus,
  IconChevronDown,
  IconChevronUp,
  IconGlobe,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconCopy,
  IconCheck,
  IconUpload,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useVault, VaultItem } from "@/app/providers/VaultProvider";
import { ITEM_TYPES } from "./AddItemModal";
import classes from "./ItemDrawer.module.css";
import { useClipboard } from "@mantine/hooks";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { resizeImageToBase64 } from "@/shared/utils/image";
import { notifications } from "@mantine/notifications";

interface ItemDrawerProps {
  item: VaultItem;
  onClose: () => void;
}

interface FormField {
  id: string;
  label: string;
  value: string;
  type: string;
  isCustom: boolean;
}

export function ItemDrawer({ item, onClose }: Readonly<ItemDrawerProps>) {
  const { t } = useTranslation();
  const { updateItem, deleteItem } = useVault();
  const clipboard = useClipboard();

  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);

  const handleCopy = (id: string, value: string) => {
    clipboard.copy(value);
    setCopiedFieldId(id);
    setTimeout(() => {
      setCopiedFieldId(null);
    }, 2000);
  };

  const handleOpenWebsite = (url: string) => {
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }
    openUrl(targetUrl).catch((err) => {
      console.error("Failed to open URL:", err);
    });
  };

  const getInitialFormFields = (): FormField[] => {
    const parsedFields: FormField[] = [];

    if (item.username !== undefined) {
      parsedFields.push({
        id: "username",
        label: t("usernameLabel", "Username"),
        value: item.username,
        type: "text",
        isCustom: false,
      });
    }

    if (item.password !== undefined) {
      parsedFields.push({
        id: "password",
        label: t("passwordLabel", "Password"),
        value: item.password,
        type: "password",
        isCustom: false,
      });
    }

    if (item.url !== undefined && item.category !== "Login") {
      const template = ITEM_TYPES.find((t) => t.id === item.category);
      const urlField = template?.fields.find((f) =>
        ["server", "endpoint", "ipAddress"].includes(f.name)
      );
      parsedFields.push({
        id: urlField?.name || "url",
        label: urlField ? t(urlField.labelKey, urlField.labelKey) : "URL",
        value: item.url,
        type: "text",
        isCustom: false,
      });
    }

    if (item.customFields) {
      item.customFields.forEach((cf) => {
        const template = ITEM_TYPES.find((t) => t.id === item.category);
        const templateField = template?.fields.find((f) => f.name === cf.id);
        parsedFields.push({
          id: cf.id,
          label: cf.label,
          value: cf.value,
          type: cf.type,
          isCustom: !templateField,
        });
      });
    }

    return parsedFields;
  };

  // Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // View state: track which password fields are revealed
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>(
    {}
  );

  // Form states (used in Edit mode)
  const [title, setTitle] = useState(item.title);
  const [formFields, setFormFields] = useState<FormField[]>(() =>
    getInitialFormFields()
  );
  const [websites, setWebsites] = useState<string[]>(() =>
    item.category === "Login" && item.url ? [item.url] : [""]
  );
  const [notes, setNotes] = useState(item.notes || "");
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [icon, setIcon] = useState<string | undefined>(item.icon);
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState("");

  const activeType = ITEM_TYPES.find((type) => type.id === item.category);

  // Reset form fields back to the current item's values
  const resetForm = () => {
    setTitle(item.title);
    setNotes(item.notes || "");
    setTags(item.tags || []);
    setTagInput("");
    setWebsites(item.category === "Login" && item.url ? [item.url] : [""]);
    setFormFields(getInitialFormFields());
    setIcon(item.icon);
    setIsFetchingIcon(false);
    setIsUrlModalOpen(false);
    setInputUrl("");
  };

  const handleUrlBlur = async (urlVal: string) => {
    if (!urlVal || !urlVal.trim() || icon) {
      return;
    }

    let domain = urlVal.trim();
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, "");
    domain = domain.split("/")[0].split(":")[0];

    if (!domain) return;

    setIsFetchingIcon(true);
    try {
      const b64 = await invoke<string>("download_favicon", { domain });
      setIcon(b64);
    } catch (err) {
      console.error("Failed to download favicon:", err);
    } finally {
      setIsFetchingIcon(false);
    }
  };

  // View mode eye toggle helper
  const toggleReveal = (fieldId: string) => {
    setRevealedFields((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };

  // Edit mode field handlers
  const handleFieldValueChange = (id: string, val: string) => {
    setFormFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value: val } : f))
    );
  };

  const handleFieldLabelChange = (id: string, label: string) => {
    setFormFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, label } : f))
    );
  };

  const handleAddCustomField = (
    type: "text" | "password" | "date" | "url" | "email" | "phone"
  ) => {
    const newField: FormField = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9),
      label: "",
      value: "",
      type,
      isCustom: true,
    };
    setFormFields((prev) => [...prev, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFormFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === formFields.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setFormFields((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Website array handlers
  const handleWebsiteChange = (index: number, val: string) => {
    const updated = [...websites];
    updated[index] = val;
    setWebsites(updated);
  };

  // Tags management
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Delete item handler
  const handleDelete = () => {
    deleteItem(item.id);
    onClose();
  };

  // Save changes handler
  const handleSave = () => {
    if (!title.trim()) return;

    const findFieldVal = (id: string) =>
      formFields.find((f) => f.id === id)?.value || "";

    const username = findFieldVal("username") || findFieldVal("adminUser");

    let password = findFieldVal("password");
    if (!password) password = findFieldVal("passphrase");
    if (!password) password = findFieldVal("wifiPassword");
    if (!password) password = findFieldVal("adminPassword");
    if (!password) password = findFieldVal("apiSecret");
    if (!password) password = findFieldVal("cvv");
    if (!password) password = findFieldVal("pin");

    const url =
      item.category === "Login"
        ? websites[0]
        : findFieldVal("server") ||
          findFieldVal("endpoint") ||
          findFieldVal("ipAddress");

    const customFieldsToSave = formFields
      .filter((field) => {
        const isUsername = field.id === "username" || field.id === "adminUser";
        const isPassword = [
          "password",
          "passphrase",
          "wifiPassword",
          "adminPassword",
          "apiSecret",
          "cvv",
          "pin",
        ].includes(field.id);
        const isUrl =
          (item.category === "Login" && field.id === "url") ||
          field.id === "server" ||
          field.id === "endpoint" ||
          field.id === "ipAddress";

        return !isUsername && !isPassword && !isUrl;
      })
      .map((field) => ({
        id: field.id,
        label: field.label || "Field name",
        value: field.value,
        type: field.type === "password" ? "password" : "text",
      }));

    updateItem(item.id, {
      title,
      username: username || undefined,
      password: password || undefined,
      url: url || undefined,
      notes: notes || undefined,
      customFields:
        customFieldsToSave.length > 0 ? customFieldsToSave : undefined,
      tags: tags.length > 0 ? tags : undefined,
      icon: icon || undefined,
    });

    setIsEditing(false);
  };

  const renderFieldInput = (field: FormField) => {
    const commonProps = {
      placeholder: field.isCustom ? "Value" : field.label,
      value: field.value,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => handleFieldValueChange(field.id, e.currentTarget.value),
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const isUrlField =
          field.id === "url" ||
          field.id === "productUrl" ||
          field.id === "endpoint" ||
          field.type === "url";
        if (isUrlField) {
          handleUrlBlur(e.currentTarget.value);
        }
      },
      radius: "md" as const,
      size: "sm" as const,
    };

    if (field.type === "password") {
      return <PasswordInput {...commonProps} />;
    }

    if (field.type === "textarea") {
      return <Textarea {...commonProps} rows={3} />;
    }

    return <TextInput {...commonProps} type={field.type} />;
  };

  return (
    <Box className={classes.drawerContainer}>
      {/* Drawer Header */}
      <Box className={classes.header}>
        {isEditing ? (
          <Menu shadow="md" width={220} position="bottom-start" withArrow>
            <Menu.Target>
              <div
                className={`${classes.iconWrapperLarge} ${!icon ? activeType?.bgClass : ""}`}
                style={{
                  cursor: "pointer",
                  flexShrink: 0,
                  background: icon ? "transparent" : undefined,
                }}
              >
                {isFetchingIcon ? (
                  <Loader size="xs" color="white" />
                ) : icon ? (
                  <Avatar src={icon} size={54} radius="lg" />
                ) : (
                  activeType &&
                  React.createElement(activeType.icon, { size: 26 })
                )}
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{t("iconOptions", "Tùy chọn biểu tượng")}</Menu.Label>

              <FileButton
                onChange={async (file) => {
                  if (file) {
                    try {
                      const b64 = await resizeImageToBase64(file);
                      setIcon(b64);
                    } catch (err) {
                      console.error("Failed to resize image:", err);
                      notifications.show({
                        title: t("errorUpload", "Lỗi tải ảnh"),
                        message: t("errorUploadDesc", "Không thể nén ảnh này."),
                        color: "red",
                      });
                    }
                  }
                }}
                accept="image/png,image/jpeg,image/webp"
              >
                {(props) => (
                  <Menu.Item {...props} leftSection={<IconUpload size={14} />}>
                    {t("uploadFromComputer", "Tải lên từ máy tính")}
                  </Menu.Item>
                )}
              </FileButton>

              <Menu.Item
                leftSection={<IconGlobe size={14} />}
                onClick={() => setIsUrlModalOpen(true)}
              >
                {t("fetchFromUrl", "Tải logo từ địa chỉ web")}
              </Menu.Item>

              {icon && (
                <>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconX size={14} />}
                    onClick={() => setIcon(undefined)}
                  >
                    {t("deleteIcon", "Xóa biểu tượng tùy chỉnh")}
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        ) : (
          <div style={{ flexShrink: 0 }}>
            {item.icon ? (
              <Avatar src={item.icon} size={54} radius="lg" />
            ) : (
              <div
                className={`${classes.iconWrapperLarge} ${activeType?.bgClass}`}
              >
                {activeType &&
                  React.createElement(activeType.icon, { size: 26 })}
              </div>
            )}
          </div>
        )}

        <Box className={classes.titleArea}>
          {isEditing ? (
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              className={classes.titleInput}
              placeholder={t("enterTitle")}
              radius="md"
              size="sm"
              required
            />
          ) : (
            <>
              <Title order={4} className={classes.titleText}>
                {item.title}
              </Title>
              <Badge color="indigo" size="xs">
                {t(`types.${item.category}`, item.category)}
              </Badge>
            </>
          )}
        </Box>
        <ActionIcon variant="subtle" color="gray" onClick={onClose}>
          <IconX size={20} />
        </ActionIcon>
      </Box>

      {/* Drawer Body Scroll */}
      <Box className={classes.scrollArea}>
        {isEditing ? (
          // ==================== EDIT MODE ====================
          <>
            {formFields.length > 0 && (
              <Box className={classes.section}>
                {formFields.map((field, idx) => (
                  <Box
                    key={field.id}
                    className={classes.customFieldBox}
                    mb="sm"
                  >
                    <Group justify="space-between" align="center" mb={2}>
                      {field.isCustom ? (
                        <TextInput
                          variant="unstyled"
                          placeholder="Field name"
                          value={field.label}
                          onChange={(e) =>
                            handleFieldLabelChange(
                              field.id,
                              e.currentTarget.value
                            )
                          }
                          radius="md"
                          size="sm"
                          style={{ flex: 1 }}
                          styles={{
                            input: {
                              fontWeight: 600,
                              color: "var(--mantine-color-white)",
                              fontSize: "var(--mantine-font-size-xs)",
                              padding: 0,
                              height: "auto",
                              minHeight: 0,
                            },
                          }}
                        />
                      ) : (
                        <Text size="xs" fw={600} c="white">
                          {field.label}
                        </Text>
                      )}

                      <Group gap={4}>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="xs"
                          disabled={idx === 0}
                          onClick={() => handleMoveField(idx, "up")}
                        >
                          <IconChevronUp size={12} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="xs"
                          disabled={idx === formFields.length - 1}
                          onClick={() => handleMoveField(idx, "down")}
                        >
                          <IconChevronDown size={12} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="xs"
                          onClick={() => handleRemoveField(field.id)}
                        >
                          <IconTrash size={12} />
                        </ActionIcon>
                      </Group>
                    </Group>

                    {renderFieldInput(field)}
                  </Box>
                ))}
              </Box>
            )}

            {item.category === "Login" && (
              <Box className={classes.section}>
                <Text size="xs" fw={600} c="white">
                  {t("websiteLabel")}
                </Text>
                <TextInput
                  placeholder="https://example.com"
                  value={websites[0]}
                  onChange={(e) =>
                    handleWebsiteChange(0, e.currentTarget.value)
                  }
                  onBlur={(e) => handleUrlBlur(e.currentTarget.value)}
                  leftSection={<IconGlobe size={14} />}
                  radius="md"
                  size="sm"
                />
              </Box>
            )}

            {/* Add custom fields menu */}
            <Group>
              <Menu shadow="md" width={180} position="bottom-start" withArrow>
                <Menu.Target>
                  <Button
                    variant="outline"
                    color="gray"
                    size="xs"
                    radius="md"
                    leftSection={<IconPlus size={12} />}
                  >
                    {t("addMoreFields")}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => handleAddCustomField("text")}>
                    Text
                  </Menu.Item>
                  <Menu.Item onClick={() => handleAddCustomField("password")}>
                    Password
                  </Menu.Item>
                  <Menu.Item onClick={() => handleAddCustomField("date")}>
                    Date
                  </Menu.Item>
                  <Menu.Item onClick={() => handleAddCustomField("url")}>
                    URL
                  </Menu.Item>
                  <Menu.Item onClick={() => handleAddCustomField("email")}>
                    Email
                  </Menu.Item>
                  <Menu.Item onClick={() => handleAddCustomField("phone")}>
                    Phone
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>

            {/* Edit Notes */}
            <Box className={classes.section}>
              <Textarea
                label={t("notesLabel")}
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                radius="md"
                size="sm"
                rows={3}
              />
            </Box>

            {/* Edit Tags */}
            <Box className={classes.section}>
              <Text size="xs" fw={600} c="white" mb={4}>
                {t("tagsLabel")}
              </Text>
              <Group gap="xs" mb="xs">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="light"
                    color="indigo"
                    size="sm"
                    rightSection={
                      <ActionIcon
                        size="xs"
                        variant="transparent"
                        color="indigo"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <IconX size={8} />
                      </ActionIcon>
                    }
                  >
                    {tag}
                  </Badge>
                ))}
              </Group>
              <TextInput
                placeholder={t("addTag")}
                value={tagInput}
                onChange={(e) => setTagInput(e.currentTarget.value)}
                onKeyDown={handleTagKeyDown}
                radius="md"
                size="xs"
                style={{ maxWidth: 180 }}
              />
            </Box>
          </>
        ) : (
          // ==================== VIEW MODE ====================
          <>
            {formFields.length > 0 && (
              <Box className={classes.section}>
                {formFields.map((field) => {
                  const isPassword = field.type === "password";
                  const isRevealed = revealedFields[field.id];
                  const displayValue =
                    isPassword && !isRevealed ? "••••••••" : field.value;

                  return (
                    <Box key={field.id} className={classes.fieldRow}>
                      <Text className={classes.fieldLabel}>{field.label}</Text>
                      <div className={classes.fieldValueWrapper}>
                        <Text className={classes.fieldValue}>
                          {displayValue || t("empty", "(Trống)")}
                        </Text>
                        <Group gap={4} style={{ flexShrink: 0 }}>
                          {isPassword && field.value && (
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => toggleReveal(field.id)}
                            >
                              {isRevealed ? (
                                <IconEyeOff size={14} />
                              ) : (
                                <IconEye size={14} />
                              )}
                            </ActionIcon>
                          )}
                          {field.value && (
                            <Tooltip
                              label={
                                copiedFieldId === field.id
                                  ? t("copied", "Copied")
                                  : t("copy", "Copy")
                              }
                              withArrow
                            >
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="sm"
                                onClick={() =>
                                  handleCopy(field.id, field.value)
                                }
                              >
                                {copiedFieldId === field.id ? (
                                  <IconCheck size={14} color="teal" />
                                ) : (
                                  <IconCopy size={14} />
                                )}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </div>
                    </Box>
                  );
                })}
              </Box>
            )}

            {item.category === "Login" && item.url && (
              <Box className={classes.section}>
                <Text className={classes.fieldLabel}>{t("websiteLabel")}</Text>
                <div className={classes.fieldValueWrapper}>
                  <Text
                    className={classes.fieldValue}
                    style={{
                      textDecoration: "underline",
                      cursor: "pointer",
                      color: "var(--color-brand-primary)",
                    }}
                    onClick={() => handleOpenWebsite(item.url!)}
                  >
                    {item.url}
                  </Text>
                  <Tooltip
                    label={
                      copiedFieldId === "website"
                        ? t("copied", "Copied")
                        : t("copy", "Copy")
                    }
                    withArrow
                  >
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => handleCopy("website", item.url!)}
                    >
                      {copiedFieldId === "website" ? (
                        <IconCheck size={14} color="teal" />
                      ) : (
                        <IconCopy size={14} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                </div>
              </Box>
            )}

            {item.notes && (
              <Box className={classes.section}>
                <Text className={classes.fieldLabel}>{t("notesLabel")}</Text>
                <Text
                  size="sm"
                  c="var(--color-neutral-dark)"
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--mantine-font-family-monospace)",
                  }}
                >
                  {item.notes}
                </Text>
              </Box>
            )}

            {item.tags && item.tags.length > 0 && (
              <Box className={classes.section}>
                <Text className={classes.fieldLabel}>{t("tagsLabel")}</Text>
                <Group gap="xs">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="outline" color="green" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Drawer Footer */}
      <Box className={classes.footer}>
        {isEditing ? (
          <>
            <Button
              variant="default"
              size="xs"
              radius="md"
              onClick={() => {
                setIsEditing(false);
                resetForm();
              }}
            >
              {t("cancelBtn")}
            </Button>
            <Button
              color="blue"
              size="xs"
              radius="md"
              onClick={handleSave}
              disabled={!title.trim()}
            >
              {t("saveBtn")}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="subtle"
              color="red"
              size="xs"
              radius="md"
              leftSection={<IconTrash size={14} />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t("delete", "Xóa")}
            </Button>
            <Button
              color="blue"
              size="xs"
              radius="md"
              leftSection={<IconEdit size={14} />}
              onClick={() => {
                resetForm();
                setIsEditing(true);
              }}
            >
              {t("edit", "Chỉnh sửa")}
            </Button>
          </>
        )}
      </Box>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t("confirmDeleteTitle", "Xác nhận xóa")}
        centered
        radius="lg"
        size="sm"
        styles={{
          content: {
            backgroundColor: "var(--color-neutral-card)",
            border: "1px solid var(--color-neutral-light)",
            color: "var(--color-neutral-dark)",
          },
          header: {
            backgroundColor: "transparent",
            color: "var(--color-neutral-dark)",
          },
        }}
      >
        <Stack gap="md">
          <Text size="sm">
            {t(
              "confirmDeleteDesc",
              "Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác."
            )}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              size="xs"
              onClick={() => setShowDeleteConfirm(false)}
            >
              {t("cancelBtn")}
            </Button>
            <Button color="red" size="xs" onClick={handleDelete}>
              {t("delete", "Xóa")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Sub-modal to enter website URL for fetching logo */}
      <Modal
        opened={isUrlModalOpen}
        onClose={() => {
          setIsUrlModalOpen(false);
          setInputUrl("");
        }}
        title={t("fetchFromUrl", "Tải logo từ địa chỉ web")}
        centered
        radius="md"
        size="sm"
        styles={{
          content: {
            backgroundColor:
              "light-dark(var(--mantine-color-white), rgba(26, 27, 30, 0.98))",
            border:
              "1px solid light-dark(var(--color-neutral-light), var(--mantine-color-dark-4))",
            color: "var(--color-neutral-dark)",
          },
        }}
      >
        <Stack gap="md">
          <TextInput
            label={t("websiteUrlLabel", "Nhập link trang web hoặc tên miền")}
            placeholder="google.com"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.currentTarget.value)}
            radius="md"
            size="sm"
            autoFocus
          />
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              radius="md"
              size="xs"
              onClick={() => {
                setIsUrlModalOpen(false);
                setInputUrl("");
              }}
            >
              {t("cancelBtn")}
            </Button>
            <Button
              color="indigo"
              radius="md"
              size="xs"
              onClick={async () => {
                if (inputUrl.trim()) {
                  setIsUrlModalOpen(false);
                  await handleUrlBlur(inputUrl);
                  setInputUrl("");
                }
              }}
            >
              {t("fetchBtn", "Tải về")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default ItemDrawer;
