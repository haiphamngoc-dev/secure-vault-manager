import React, { useState, useMemo, useEffect } from "react";
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
  Transition,
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
  IconFolderPlus,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useVault, VaultItem } from "@/app/providers/VaultProvider";
import { ITEM_TYPES } from "./AddItemModal";
import { TotpDisplay } from "./TotpDisplay";
import classes from "./ItemDrawer.module.css";
import { useClipboard } from "@mantine/hooks";
import { openUrl } from "@tauri-apps/plugin-opener";

interface ItemDrawerProps {
  item: VaultItem;
  onClose: () => void;
}

interface FormField {
  id: string;
  label: string;
  value: string;
  type: string;
  section?: string;
  isCustom: boolean;
}

const drawerSlideTransition = {
  in: { transform: "translateX(0)" },
  out: { transform: "translateX(100%)" },
  common: { transformOrigin: "right center" },
  transitionProperty: "transform",
};

function generateCustomFieldId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const ItemDrawer = React.memo(function ItemDrawer({
  item,
  onClose,
}: Readonly<ItemDrawerProps>) {
  const { t } = useTranslation();
  const { updateItem, deleteItem } = useVault();
  const clipboard = useClipboard();

  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setOpened(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleClose = () => {
    setOpened(false);
  };

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
          section: cf.section,
          isCustom: !templateField,
        });
      });
    }

    return parsedFields;
  };

  // Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<{
    name: string;
    fieldCount: number;
  } | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !showDeleteConfirm &&
        !sectionToDelete &&
        !isUrlModalOpen
      ) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteConfirm, sectionToDelete, isUrlModalOpen]);

  // View state: track which password fields are revealed
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>(
    {}
  );

  // Form states (used in Edit mode)
  const [title, setTitle] = useState(item.title);
  const [formFields, setFormFields] = useState<FormField[]>(() =>
    getInitialFormFields()
  );
  const [extraSections, setExtraSections] = useState<string[]>([]);
  const [websites, setWebsites] = useState<string[]>(() =>
    item.category === "Login" && item.url ? [item.url] : [""]
  );
  const [notes, setNotes] = useState(item.notes || "");
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [icon, setIcon] = useState<string | undefined>(item.icon);
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);

  const activeType = ITEM_TYPES.find((t) => t.id === item.category);

  // List of all distinct section names in edit mode
  const allEditSections = useMemo(() => {
    const set = new Set<string>();
    formFields.forEach((f) => {
      set.add((f.section || "").trim());
    });
    extraSections.forEach((s) => set.add(s.trim()));
    return Array.from(set);
  }, [formFields, extraSections]);

  // Section Handlers
  const handleAddSection = () => {
    const newSecName = `Section ${allEditSections.length + 1}`;
    setExtraSections((prev) => [...prev, newSecName]);
  };

  const handleRenameSection = (oldName: string, newName: string) => {
    setExtraSections((prev) => prev.map((s) => (s === oldName ? newName : s)));
    setFormFields((prev) =>
      prev.map((f) =>
        (f.section || "").trim() === oldName.trim()
          ? { ...f, section: newName }
          : f
      )
    );
  };

  const handleRemoveSectionClick = (secName: string) => {
    const fieldsInSec = formFields.filter(
      (f) => (f.section || "").trim() === secName.trim()
    );
    if (fieldsInSec.length === 0) {
      setExtraSections((prev) => prev.filter((s) => s !== secName));
    } else {
      setSectionToDelete({ name: secName, fieldCount: fieldsInSec.length });
    }
  };

  const confirmDeleteSection = () => {
    if (!sectionToDelete) return;
    const secName = sectionToDelete.name.trim();
    setFormFields((prev) =>
      prev.filter((f) => (f.section || "").trim() !== secName)
    );
    setExtraSections((prev) => prev.filter((s) => s.trim() !== secName));
    setSectionToDelete(null);
  };

  // Group fields by section for rendering
  const viewSectionGroups = useMemo(() => {
    const map: Record<string, FormField[]> = {};
    formFields.forEach((field) => {
      const key = (field.section || "").trim();
      if (!map[key]) map[key] = [];
      map[key].push(field);
    });
    return map;
  }, [formFields]);

  const viewSectionKeys = Object.keys(viewSectionGroups);
  const showSectionHeaders =
    viewSectionKeys.length > 1 ||
    (viewSectionKeys.length === 1 && viewSectionKeys[0] !== "");

  const toggleReveal = (fieldId: string) => {
    setRevealedFields((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

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

  const handleWebsiteChange = (index: number, val: string) => {
    setWebsites((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleUrlBlur = async (urlVal: string) => {
    const trimmed = urlVal.trim();
    if (!trimmed) return;

    setIsFetchingIcon(true);
    try {
      let domain = trimmed;
      if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
        domain = `https://${domain}`;
      }
      const parsed = new URL(domain);
      const iconUrl = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
      setIcon(iconUrl);
    } catch {
      // ignore
    } finally {
      setIsFetchingIcon(false);
    }
  };

  const handleAddCustomField = (
    type: string,
    defaultLabel = "",
    targetSection?: string
  ) => {
    const newField: FormField = {
      id: generateCustomFieldId(),
      label: defaultLabel || "",
      value: "",
      type,
      section: targetSection,
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

    setFormFields((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = () => {
    const findFieldVal = (id: string) =>
      formFields.find((f) => f.id === id)?.value;

    const username = findFieldVal("username") || findFieldVal("adminUser");

    const password =
      findFieldVal("password") ||
      findFieldVal("passphrase") ||
      findFieldVal("wifiPassword") ||
      findFieldVal("adminPassword") ||
      findFieldVal("apiSecret") ||
      findFieldVal("cvv") ||
      findFieldVal("pin");

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
        label: field.label || t("defaultFieldName", "Tên trường"),
        value: field.value,
        type: field.type === "password" ? "password" : "text",
        section: field.section || undefined,
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
      placeholder: field.isCustom
        ? t("fieldValuePlaceholder", "Giá trị")
        : field.label,
      value: field.value,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => handleFieldValueChange(field.id, e.currentTarget.value),
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const isUrlField =
          field.id === "url" ||
          field.id === "productUrl" ||
          field.id === "endpoint" ||
          field.id === "server" ||
          field.id === "ipAddress";
        if (isUrlField) {
          handleUrlBlur(e.currentTarget.value);
        }
      },
      radius: "md" as const,
      size: "sm" as const,
    };

    if (field.type === "password") {
      return (
        <PasswordInput
          {...commonProps}
          placeholder={
            field.isCustom
              ? t("passwordValuePlaceholder", "Giá trị mật khẩu")
              : field.label
          }
        />
      );
    }

    if (field.type === "textarea" || field.id === "notes") {
      return <Textarea {...commonProps} rows={3} />;
    }

    return <TextInput {...commonProps} />;
  };

  const renderAddFieldMenu = (targetSection?: string) => (
    <Menu shadow="md" width={220} position="bottom-start" withArrow>
      <Menu.Target>
        <Button
          variant="subtle"
          color="blue"
          size="xs"
          radius="md"
          leftSection={<IconPlus size={12} />}
        >
          {t("addMoreFields", "Thêm trường mới")}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          onClick={() =>
            handleAddCustomField(
              "password",
              "One-Time Password (TOTP)",
              targetSection
            )
          }
        >
          {t("fieldTypeTotp", "Mã 2FA / TOTP Secret")}
        </Menu.Item>
        <Menu.Item
          onClick={() => handleAddCustomField("text", "", targetSection)}
        >
          {t("fieldTypeText", "Text (Văn bản)")}
        </Menu.Item>
        <Menu.Item
          onClick={() => handleAddCustomField("password", "", targetSection)}
        >
          {t("fieldTypePassword", "Password (Mật khẩu)")}
        </Menu.Item>
        <Menu.Item
          onClick={() => handleAddCustomField("date", "", targetSection)}
        >
          {t("fieldTypeDate", "Date (Ngày)")}
        </Menu.Item>
        <Menu.Item
          onClick={() => handleAddCustomField("url", "", targetSection)}
        >
          {t("fieldTypeUrl", "URL (Trang web)")}
        </Menu.Item>
        <Menu.Item
          onClick={() => handleAddCustomField("email", "", targetSection)}
        >
          {t("fieldTypeEmail", "Email")}
        </Menu.Item>
        <Menu.Item
          onClick={() => handleAddCustomField("phone", "", targetSection)}
        >
          {t("fieldTypePhone", "Phone (Số điện thoại)")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  return (
    <Transition
      mounted={opened}
      transition={drawerSlideTransition}
      duration={250}
      timingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
      onExited={onClose}
    >
      {(styles) => (
        <Box style={styles} className={classes.drawerContainer}>
          {/* Drawer Header */}
          <Box className={classes.header}>
            {isEditing ? (
              <Menu shadow="md" width={200} position="bottom-start" withArrow>
                <Menu.Target>
                  <Tooltip label={t("changeIcon", "Đổi biểu tượng")}>
                    <Box style={{ cursor: "pointer", position: "relative" }}>
                      {icon ? (
                        <Avatar src={icon} size={54} radius="lg" />
                      ) : (
                        <div
                          className={`${classes.iconWrapperLarge} ${activeType?.bgClass}`}
                        >
                          {activeType &&
                            React.createElement(activeType.icon, { size: 26 })}
                        </div>
                      )}
                      {isFetchingIcon && (
                        <Box
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor: "rgba(0,0,0,0.5)",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Loader size="xs" color="white" />
                        </Box>
                      )}
                    </Box>
                  </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconGlobe size={14} />}
                    onClick={() => setIsUrlModalOpen(true)}
                  >
                    {t("fetchFromUrl", "Lấy từ URL trang web")}
                  </Menu.Item>

                  <FileButton
                    onChange={(file) => {
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          if (e.target?.result) {
                            setIcon(e.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    accept="image/png,image/jpeg,image/svg+xml"
                  >
                    {(props) => (
                      <Menu.Item
                        leftSection={<IconUpload size={14} />}
                        {...props}
                      >
                        {t("uploadImage", "Tải lên ảnh từ máy tính")}
                      </Menu.Item>
                    )}
                  </FileButton>

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
            <ActionIcon variant="subtle" color="gray" onClick={handleClose}>
              <IconX size={20} />
            </ActionIcon>
          </Box>

          {/* Drawer Body Scroll */}
          <Box className={classes.scrollArea}>
            {isEditing ? (
              // ==================== EDIT MODE ====================
              <>
                {allEditSections.map((secName) => {
                  const secFields = formFields.filter(
                    (f) => (f.section || "").trim() === secName
                  );

                  return (
                    <Box key={secName || "default"} className={classes.section}>
                      {/* Section Header if custom section or multiple sections */}
                      <Box className={classes.sectionHeader}>
                        {secName ? (
                          <TextInput
                            variant="unstyled"
                            value={secName}
                            onChange={(e) =>
                              handleRenameSection(
                                secName,
                                e.currentTarget.value
                              )
                            }
                            className={classes.sectionTitleInput}
                            placeholder={t(
                              "sectionNamePlaceholder",
                              "Tên Section"
                            )}
                            styles={{
                              input: {
                                fontWeight: 700,
                                color: "var(--mantine-color-blue-4)",
                                fontSize: "var(--mantine-font-size-xs)",
                                padding: 0,
                                height: "auto",
                              },
                            }}
                          />
                        ) : (
                          <Text className={classes.sectionTitle}>
                            {t("generalSection", "Thông tin chung")}
                          </Text>
                        )}

                        {secName && (
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="xs"
                            onClick={() => handleRemoveSectionClick(secName)}
                            title={t("deleteSectionTooltip", "Xóa Section này")}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        )}
                      </Box>

                      {/* Section Fields */}
                      {secFields.map((field) => {
                        const idxInAll = formFields.findIndex(
                          (f) => f.id === field.id
                        );
                        return (
                          <Box
                            key={field.id}
                            className={classes.customFieldBox}
                            mb="sm"
                          >
                            <Group
                              justify="space-between"
                              align="center"
                              mb={2}
                            >
                              {field.isCustom ? (
                                <TextInput
                                  variant="unstyled"
                                  placeholder={t(
                                    "fieldNamePlaceholder",
                                    "Tên trường"
                                  )}
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
                                  disabled={idxInAll === 0}
                                  onClick={() =>
                                    handleMoveField(idxInAll, "up")
                                  }
                                >
                                  <IconChevronUp size={12} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="xs"
                                  disabled={idxInAll === formFields.length - 1}
                                  onClick={() =>
                                    handleMoveField(idxInAll, "down")
                                  }
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
                        );
                      })}

                      {/* Add Field to specific section */}
                      <Group justify="flex-start" mt="xs">
                        {renderAddFieldMenu(secName)}
                      </Group>
                    </Box>
                  );
                })}

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

                {/* Button to add a new Section Block */}
                <Button
                  variant="dashed"
                  color="blue"
                  size="xs"
                  radius="md"
                  fullWidth
                  leftSection={<IconFolderPlus size={14} />}
                  onClick={handleAddSection}
                  className={classes.addSectionBtn}
                >
                  {t("addSectionBtn", "+ Thêm Section mới")}
                </Button>

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
                {viewSectionKeys.map((secKey) => {
                  const secFields = viewSectionGroups[secKey];
                  if (!secFields || secFields.length === 0) return null;

                  return (
                    <Box key={secKey || "default"} className={classes.section}>
                      {showSectionHeaders && (
                        <Box className={classes.sectionHeader}>
                          <Text className={classes.sectionTitle}>
                            {secKey || t("generalSection", "Thông tin chung")}
                          </Text>
                        </Box>
                      )}

                      {secFields.map((field) => {
                        const isTotp =
                          field.value?.startsWith("otpauth://") ||
                          field.label?.toLowerCase().includes("totp") ||
                          field.label?.toLowerCase().includes("one-time");

                        if (isTotp && field.value) {
                          return (
                            <Box key={field.id} mb="sm">
                              <TotpDisplay
                                uriOrSecret={field.value}
                                label={field.label}
                                showSecretPreview
                              />
                            </Box>
                          );
                        }

                        const isPassword = field.type === "password";
                        const isRevealed = revealedFields[field.id];
                        const displayValue =
                          isPassword && !isRevealed ? "••••••••" : field.value;

                        return (
                          <Box key={field.id} className={classes.fieldRow}>
                            <Text className={classes.fieldLabel}>
                              {field.label}
                            </Text>
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
                  );
                })}

                {item.category === "Login" && item.url && (
                  <Box className={classes.section}>
                    <Text className={classes.fieldLabel}>
                      {t("websiteLabel")}
                    </Text>
                    <Group justify="space-between" align="center">
                      <Text
                        className={classes.fieldValue}
                        style={{
                          cursor: "pointer",
                          color: "var(--mantine-color-blue-4)",
                        }}
                        onClick={() => handleOpenWebsite(item.url!)}
                      >
                        {item.url}
                      </Text>
                      <Tooltip
                        label={t("openWebsite", "Mở trang web")}
                        withArrow
                      >
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                          onClick={() => handleOpenWebsite(item.url!)}
                        >
                          <IconGlobe size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Box>
                )}

                {item.notes && (
                  <Box className={classes.section}>
                    <Text className={classes.fieldLabel}>
                      {t("notesLabel")}
                    </Text>
                    <Text
                      size="sm"
                      c="var(--color-neutral-dark)"
                      style={{ whiteSpace: "pre-wrap" }}
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
                        <Badge
                          key={tag}
                          variant="light"
                          color="indigo"
                          size="sm"
                          radius="md"
                        >
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
                  onClick={() => {
                    setIsEditing(false);
                    setTitle(item.title);
                    setFormFields(getInitialFormFields());
                    setNotes(item.notes || "");
                    setTags(item.tags || []);
                    setIcon(item.icon);
                    setExtraSections([]);
                  }}
                >
                  {t("cancelBtn")}
                </Button>
                <Button color="blue" size="xs" onClick={handleSave}>
                  {t("saveBtn")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  color="red"
                  variant="light"
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {t("deleteBtn")}
                </Button>
                <Button
                  color="blue"
                  size="xs"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => setIsEditing(true)}
                >
                  {t("editBtn")}
                </Button>
              </>
            )}
          </Box>

          {/* Modal Confirm Delete Item */}
          <Modal
            opened={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title={t("confirmDeleteTitle")}
            radius="lg"
            centered
            size="sm"
          >
            <Stack gap="md">
              <Text size="sm">{t("confirmDeleteDesc")}</Text>
              <Group justify="flex-end" gap="sm">
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {t("cancelBtn")}
                </Button>
                <Button
                  color="red"
                  size="xs"
                  onClick={() => {
                    deleteItem(item.id);
                    handleClose();
                  }}
                >
                  {t("confirmDeleteBtn")}
                </Button>
              </Group>
            </Stack>
          </Modal>

          {/* Modal Confirm Delete Section */}
          <Modal
            opened={!!sectionToDelete}
            onClose={() => setSectionToDelete(null)}
            title={t("confirmDeleteSectionTitle", "Xóa Section")}
            radius="lg"
            centered
            size="sm"
          >
            <Stack gap="md">
              <Text size="sm">
                {t("confirmDeleteSectionDesc", {
                  name: sectionToDelete?.name,
                  count: sectionToDelete?.fieldCount,
                  defaultValue: `Bạn có chắc chắn muốn xóa Section "${sectionToDelete?.name}" và ${sectionToDelete?.fieldCount} trường dữ liệu bên trong không?`,
                })}
              </Text>
              <Group justify="flex-end" gap="sm">
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => setSectionToDelete(null)}
                >
                  {t("cancelBtn", "Hủy")}
                </Button>
                <Button color="red" size="xs" onClick={confirmDeleteSection}>
                  {t("deleteBtn", "Xóa")}
                </Button>
              </Group>
            </Stack>
          </Modal>

          {/* Modal Fetch Favicon by URL */}
          <Modal
            opened={isUrlModalOpen}
            onClose={() => setIsUrlModalOpen(false)}
            title={t("fetchFromUrlTitle", "Tải biểu tượng từ trang web")}
            radius="lg"
            centered
            size="sm"
          >
            <Stack gap="md">
              <TextInput
                placeholder="https://example.com"
                label={t("websiteUrl", "Địa chỉ URL")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUrlBlur(e.currentTarget.value);
                    setIsUrlModalOpen(false);
                  }
                }}
              />
              <Group justify="flex-end">
                <Button
                  size="xs"
                  onClick={(e) => {
                    const input =
                      e.currentTarget.parentElement?.previousElementSibling?.querySelector(
                        "input"
                      );
                    if (input) {
                      handleUrlBlur(input.value);
                    }
                    setIsUrlModalOpen(false);
                  }}
                >
                  {t("fetchBtn", "Tải biểu tượng")}
                </Button>
              </Group>
            </Stack>
          </Modal>
        </Box>
      )}
    </Transition>
  );
});

export default ItemDrawer;
