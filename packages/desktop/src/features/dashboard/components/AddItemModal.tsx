import React, { useState } from "react";
import {
  Modal,
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
} from "@mantine/core";
import {
  IconKey,
  IconFileText,
  IconCreditCard,
  IconUser,
  IconLock,
  IconTerminal,
  IconCode,
  IconBuildingBank,
  IconWallet,
  IconDatabase,
  IconId,
  IconMail,
  IconHeart,
  IconAward,
  IconMap,
  IconEPassport,
  IconGift,
  IconServer,
  IconFingerprint,
  IconCertificate,
  IconWifi,
  IconChevronLeft,
  IconChevronUp,
  IconX,
  IconTrash,
  IconPlus,
  IconChevronDown,
  IconSearch,
  IconGlobe,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { useVault } from "@/app/providers/VaultProvider";
import classes from "./AddItemModal.module.css";

// Interface definitions
interface AddItemModalProps {
  opened: boolean;
  onClose: () => void;
}

// 22 Predefined Item Type Templates
export const ITEM_TYPES = [
  {
    id: "Login",
    icon: IconKey,
    bgClass: classes.bgLogin,
    isPrimary: true,
    fields: [
      { name: "username", labelKey: "usernameLabel", type: "text" },
      { name: "password", labelKey: "passwordLabel", type: "password" },
    ],
  },
  {
    id: "Secure Note",
    icon: IconFileText,
    bgClass: classes.bgNote,
    isPrimary: true,
    fields: [],
  },
  {
    id: "Credit Card",
    icon: IconCreditCard,
    bgClass: classes.bgCard,
    isPrimary: true,
    fields: [
      { name: "cardholder", labelKey: "Cardholder Name", type: "text" },
      { name: "cardNumber", labelKey: "Card Number", type: "text" },
      { name: "expiry", labelKey: "Expiration Date (MM/YYYY)", type: "text" },
      { name: "cvv", labelKey: "CVV", type: "password" },
      { name: "pin", labelKey: "PIN", type: "password" },
    ],
  },
  {
    id: "Identity",
    icon: IconUser,
    bgClass: classes.bgIdentity,
    isPrimary: true,
    fields: [
      { name: "fullName", labelKey: "Full Name", type: "text" },
      { name: "gender", labelKey: "Gender", type: "text" },
      { name: "dob", labelKey: "Date of Birth", type: "date" },
      { name: "ssn", labelKey: "SSN", type: "text" },
      { name: "email", labelKey: "Email", type: "text" },
      { name: "phone", labelKey: "Phone", type: "text" },
    ],
  },
  {
    id: "Password",
    icon: IconLock,
    bgClass: classes.bgPassword,
    isPrimary: true,
    fields: [{ name: "password", labelKey: "passwordLabel", type: "password" }],
  },
  {
    id: "Document",
    icon: IconFileText,
    bgClass: classes.bgDocument,
    isPrimary: true,
    fields: [{ name: "docTitle", labelKey: "Document Title", type: "text" }],
  },
  {
    id: "SSH Key",
    icon: IconTerminal,
    bgClass: classes.bgSsh,
    isPrimary: false,
    fields: [
      { name: "passphrase", labelKey: "Passphrase", type: "password" },
      { name: "privateKey", labelKey: "Private Key", type: "textarea" },
      { name: "publicKey", labelKey: "Public Key", type: "textarea" },
    ],
  },
  {
    id: "API Credentials",
    icon: IconCode,
    bgClass: classes.bgApi,
    isPrimary: false,
    fields: [
      { name: "apiKey", labelKey: "API Key", type: "text" },
      { name: "apiSecret", labelKey: "API Secret", type: "password" },
      { name: "endpoint", labelKey: "Endpoint URL", type: "text" },
    ],
  },
  {
    id: "Bank Account",
    icon: IconBuildingBank,
    bgClass: classes.bgBank,
    isPrimary: false,
    fields: [
      { name: "bankName", labelKey: "Bank Name", type: "text" },
      { name: "routingNumber", labelKey: "Routing Number", type: "text" },
      { name: "accountNumber", labelKey: "Account Number", type: "text" },
      { name: "swiftCode", labelKey: "SWIFT/BIC Code", type: "text" },
    ],
  },
  {
    id: "Crypto Wallet",
    icon: IconWallet,
    bgClass: classes.bgCrypto,
    isPrimary: false,
    fields: [
      { name: "walletAddress", labelKey: "Wallet Address", type: "text" },
      {
        name: "seedPhrase",
        labelKey: "Seed Phrase (12/24 words)",
        type: "textarea",
      },
      { name: "network", labelKey: "Network (e.g. Ethereum)", type: "text" },
    ],
  },
  {
    id: "Database",
    icon: IconDatabase,
    bgClass: classes.bgDatabase,
    isPrimary: false,
    fields: [
      { name: "dbType", labelKey: "Database Type", type: "text" },
      { name: "server", labelKey: "Server/Host", type: "text" },
      { name: "port", labelKey: "Port", type: "text" },
      { name: "databaseName", labelKey: "Database Name", type: "text" },
      { name: "username", labelKey: "Username", type: "text" },
      { name: "password", labelKey: "passwordLabel", type: "password" },
      { name: "sid", labelKey: "SID", type: "text" },
      { name: "alias", labelKey: "Alias", type: "text" },
      { name: "options", labelKey: "Connection Options", type: "text" },
    ],
  },
  {
    id: "Driver License",
    icon: IconId,
    bgClass: classes.bgLicense,
    isPrimary: false,
    fields: [
      { name: "licenseNumber", labelKey: "License Number", type: "text" },
      { name: "expirationDate", labelKey: "Expiration Date", type: "date" },
      { name: "stateProvince", labelKey: "State/Province", type: "text" },
    ],
  },
  {
    id: "Email",
    icon: IconMail,
    bgClass: classes.bgEmail,
    isPrimary: false,
    fields: [
      { name: "emailAddress", labelKey: "Email Address", type: "text" },
      { name: "password", labelKey: "passwordLabel", type: "password" },
      { name: "incomingServer", labelKey: "Incoming Server", type: "text" },
      { name: "outgoingServer", labelKey: "Outgoing Server", type: "text" },
    ],
  },
  {
    id: "Medical Record",
    icon: IconHeart,
    bgClass: classes.bgMedical,
    isPrimary: false,
    fields: [
      { name: "patientName", labelKey: "Patient Name", type: "text" },
      { name: "bloodType", labelKey: "Blood Type", type: "text" },
      { name: "allergies", labelKey: "Allergies", type: "textarea" },
      { name: "medications", labelKey: "Medications", type: "textarea" },
    ],
  },
  {
    id: "Membership",
    icon: IconAward,
    bgClass: classes.bgMembership,
    isPrimary: false,
    fields: [
      { name: "organization", labelKey: "Organization Name", type: "text" },
      { name: "memberId", labelKey: "Member ID", type: "text" },
      { name: "expirationDate", labelKey: "Expiration Date", type: "date" },
    ],
  },
  {
    id: "Outdoor License",
    icon: IconMap,
    bgClass: classes.bgOutdoor,
    isPrimary: false,
    fields: [
      { name: "licenseType", labelKey: "License Type", type: "text" },
      { name: "licenseNumber", labelKey: "License Number", type: "text" },
      { name: "expirationDate", labelKey: "Expiration Date", type: "date" },
    ],
  },
  {
    id: "Passport",
    icon: IconEPassport,
    bgClass: classes.bgPassport,
    isPrimary: false,
    fields: [
      { name: "passportNumber", labelKey: "Passport Number", type: "text" },
      { name: "issueDate", labelKey: "Issue Date", type: "date" },
      { name: "expirationDate", labelKey: "Expiration Date", type: "date" },
      { name: "country", labelKey: "Country of Issue", type: "text" },
    ],
  },
  {
    id: "Rewards",
    icon: IconGift,
    bgClass: classes.bgRewards,
    isPrimary: false,
    fields: [
      { name: "program", labelKey: "Program Name", type: "text" },
      { name: "memberId", labelKey: "Member ID", type: "text" },
      { name: "points", labelKey: "Points Balance", type: "text" },
    ],
  },
  {
    id: "Server",
    icon: IconServer,
    bgClass: classes.bgServer,
    isPrimary: false,
    fields: [
      { name: "ipAddress", labelKey: "IP Address", type: "text" },
      { name: "hostname", labelKey: "Hostname", type: "text" },
      { name: "username", labelKey: "Username", type: "text" },
      { name: "password", labelKey: "passwordLabel", type: "password" },
      { name: "sshPort", labelKey: "SSH Port", type: "text" },
    ],
  },
  {
    id: "Social Security Number",
    icon: IconFingerprint,
    bgClass: classes.bgSsn,
    isPrimary: false,
    fields: [
      { name: "fullName", labelKey: "Full Name", type: "text" },
      { name: "ssnNumber", labelKey: "SSN Number", type: "text" },
      { name: "dob", labelKey: "Date of Birth", type: "date" },
    ],
  },
  {
    id: "Software License",
    icon: IconCertificate,
    bgClass: classes.bgSoftware,
    isPrimary: false,
    fields: [
      { name: "licenseKey", labelKey: "License Key", type: "textarea" },
      { name: "productUrl", labelKey: "Product URL", type: "text" },
      { name: "orderNumber", labelKey: "Order Number", type: "text" },
    ],
  },
  {
    id: "Wireless Router",
    icon: IconWifi,
    bgClass: classes.bgWifi,
    isPrimary: false,
    fields: [
      { name: "ssid", labelKey: "SSID/Network Name", type: "text" },
      { name: "wifiPassword", labelKey: "Wi-Fi Password", type: "password" },
      { name: "adminUser", labelKey: "Admin Username", type: "text" },
      { name: "adminPassword", labelKey: "Admin Password", type: "password" },
    ],
  },
];

const generateId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 9);

interface WebsiteInput {
  id: string;
  value: string;
}

export function AddItemModal({ opened, onClose }: Readonly<AddItemModalProps>) {
  const { t } = useTranslation();
  const { addItem } = useVault();

  // Selection states
  const [search, setSearch] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  interface FormField {
    id: string;
    label: string;
    value: string;
    type: string;
    isCustom: boolean;
  }
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [websites, setWebsites] = useState<WebsiteInput[]>([
    { id: generateId(), value: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const activeType = ITEM_TYPES.find((type) => type.id === selectedType);

  const resetForm = () => {
    setSearch("");
    setShowMore(false);
    setSelectedType(null);
    setTitle("");
    setFormFields([]);
    setWebsites([{ id: generateId(), value: "" }]);
    setNotes("");
    setTags([]);
    setTagInput("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setTitle("");
    const typeObj = ITEM_TYPES.find((t) => t.id === typeId);
    if (typeObj) {
      const initialFields: FormField[] = typeObj.fields.map((f) => ({
        id: f.name,
        label: t(f.labelKey, f.labelKey),
        value: "",
        type: f.type,
        isCustom: false,
      }));
      setFormFields(initialFields);
    } else {
      setFormFields([]);
    }
  };

  // Add website input
  const handleAddWebsite = () => {
    setWebsites([...websites, { id: generateId(), value: "" }]);
  };

  const handleWebsiteChange = (index: number, val: string) => {
    const updated = [...websites];
    updated[index] = { ...updated[index], value: val };
    setWebsites(updated);
  };

  const handleRemoveWebsite = (index: number) => {
    setWebsites(websites.filter((_, idx) => idx !== index));
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

  // Custom fields
  const handleAddCustomField = (
    type: "text" | "password" | "date" | "url" | "email" | "phone"
  ) => {
    const newField: FormField = {
      id: generateId(),
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

  // Save secure item
  const handleSave = () => {
    if (!title.trim()) {
      return;
    }

    const findFieldVal = (id: string) =>
      formFields.find((f) => f.id === id)?.value || "";

    // Extract first-class fields if they are in formFields
    const username = findFieldVal("username") || findFieldVal("adminUser");

    let password = findFieldVal("password");
    if (!password) password = findFieldVal("passphrase");
    if (!password) password = findFieldVal("wifiPassword");
    if (!password) password = findFieldVal("adminPassword");
    if (!password) password = findFieldVal("apiSecret");
    if (!password) password = findFieldVal("cvv");
    if (!password) password = findFieldVal("pin");

    const url =
      selectedType === "Login"
        ? websites[0]?.value
        : findFieldVal("server") ||
          findFieldVal("endpoint") ||
          findFieldVal("ipAddress");

    // Now, any field in formFields that is NOT mapped to first-class fields (username, password, url)
    // should be saved in customFields!
    // AND it should preserve the order in which they appear in the form!
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
          (selectedType === "Login" && field.id === "url") ||
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

    addItem({
      title,
      category: selectedType || "Login",
      username: username || undefined,
      password: password || undefined,
      url: url || undefined,
      notes: notes || undefined,
      customFields:
        customFieldsToSave.length > 0 ? customFieldsToSave : undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    notifications.show({
      title: t("successCreate"),
      message: "",
      color: "teal",
    });

    handleClose();
  };

  // Filter item types based on search input
  const filteredTypes = ITEM_TYPES.filter((type) => {
    const localizedName = t(`types.${type.id}`, type.id);
    return localizedName.toLowerCase().includes(search.toLowerCase());
  });

  const renderFieldInput = (field: FormField) => {
    const commonProps = {
      placeholder: field.isCustom ? "Value" : field.label,
      value: field.value,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => handleFieldValueChange(field.id, e.currentTarget.value),
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
    <Modal
      opened={opened}
      onClose={handleClose}
      withCloseButton={false}
      size={selectedType ? "lg" : "xl"}
      radius="lg"
      overlayProps={{
        blur: 8,
        backgroundOpacity: 0.35,
      }}
      classNames={{
        content: classes.modalContent,
        overlay: classes.modalOverlay,
        inner: classes.modalInner,
      }}
    >
      {/* Dynamic Modal Body */}
      {selectedType ? (
        // Step 2: Form Creator
        <Box p="md">
          {/* Custom Form Header */}
          <Group justify="space-between" align="center" mb="lg">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setSelectedType(null)}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Title order={4} className={classes.modalTitle}>
              {t("newItemTitle")}
            </Title>
            <ActionIcon variant="subtle" color="gray" onClick={handleClose}>
              <IconX size={20} />
            </ActionIcon>
          </Group>

          {/* Form Header details */}
          <Box className={classes.formHeader}>
            <div
              className={`${classes.iconWrapperLarge} ${activeType?.bgClass}`}
            >
              {activeType && React.createElement(activeType.icon, { size: 30 })}
            </div>
            <TextInput
              placeholder={t("enterTitle")}
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              className={classes.titleInput}
              radius="md"
              size="sm"
              required
            />
          </Box>

          {/* Dynamic template and custom inputs */}
          {formFields.length > 0 && (
            <Box className={classes.formSection}>
              {formFields.map((field, idx) => (
                <Box key={field.id} className={classes.customFieldBox} mb="md">
                  {/* Field Header / Label row */}
                  <Group justify="space-between" align="center" mb={4}>
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
                            color: "var(--color-neutral-dark)",
                            fontSize: "var(--mantine-font-size-sm)",
                            padding: 0,
                            height: "auto",
                            minHeight: 0,
                          },
                        }}
                      />
                    ) : (
                      <Text size="sm" fw={600}>
                        {field.label}
                      </Text>
                    )}

                    {/* Move and delete controls */}
                    <Group gap={4}>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        disabled={idx === 0}
                        onClick={() => handleMoveField(idx, "up")}
                      >
                        <IconChevronUp size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        disabled={idx === formFields.length - 1}
                        onClick={() => handleMoveField(idx, "down")}
                      >
                        <IconChevronDown size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleRemoveField(field.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  {/* Input value row */}
                  {renderFieldInput(field)}
                </Box>
              ))}
            </Box>
          )}

          {/* Specialized Login websites input */}
          {selectedType === "Login" && (
            <Box className={classes.formSection}>
              <Text size="sm" fw={600} mb="xs">
                {t("websiteLabel")}
              </Text>
              {websites.map((web, idx) => (
                <Box key={web.id} className={classes.websiteRow}>
                  <TextInput
                    placeholder="https://example.com"
                    value={web.value}
                    onChange={(e) =>
                      handleWebsiteChange(idx, e.currentTarget.value)
                    }
                    leftSection={<IconGlobe size={16} />}
                    radius="md"
                    size="sm"
                    style={{ flex: 1 }}
                  />
                  {websites.length > 1 && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleRemoveWebsite(idx)}
                      mb={4}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Box>
              ))}
              <Button
                variant="subtle"
                color="indigo"
                size="xs"
                onClick={handleAddWebsite}
                leftSection={<IconPlus size={14} />}
                mt="xs"
              >
                {t("addWebsiteBtn")}
              </Button>
            </Box>
          )}

          {/* Add more fields dropdown */}
          <Group mb="md">
            <Menu shadow="md" width={200} position="bottom-start" withArrow>
              <Menu.Target>
                <Button
                  variant="outline"
                  color="gray"
                  size="xs"
                  radius="md"
                  leftSection={<IconPlus size={14} />}
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

          {/* General Notes */}
          <Box className={classes.formSection}>
            <Textarea
              label={t("notesLabel")}
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              radius="md"
              size="sm"
              rows={4}
            />
          </Box>

          {/* Tags management */}
          <Box className={classes.formSection}>
            <Text size="sm" fw={600} mb="xs">
              {t("tagsLabel")}
            </Text>
            <Group gap="xs" mb="xs">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="light"
                  color="indigo"
                  size="sm"
                  className={classes.tagBadge}
                  rightSection={
                    <ActionIcon
                      size="xs"
                      variant="transparent"
                      color="indigo"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <IconX size={10} />
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
              style={{ maxWidth: 200 }}
            />
          </Box>

          {/* Form Actions footer */}
          <Group justify="flex-end" gap="sm" mt="xl">
            <Button variant="default" radius="md" onClick={handleClose}>
              {t("cancelBtn")}
            </Button>
            <Button
              color="indigo"
              radius="md"
              onClick={handleSave}
              disabled={!title.trim()}
            >
              {t("saveBtn")}
            </Button>
          </Group>
        </Box>
      ) : (
        // Step 1: Type Selection Screen
        <Box p="md">
          {/* Custom Header */}
          <Group justify="space-between" align="center" mb="lg">
            <div style={{ width: 32 }} />
            <Title order={3} className={classes.modalTitle}>
              {t("modalTitleAdd")}
            </Title>
            <ActionIcon variant="subtle" color="gray" onClick={handleClose}>
              <IconX size={20} />
            </ActionIcon>
          </Group>

          {/* Search bar */}
          <Box className={classes.searchBox}>
            <TextInput
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={18} />}
              radius="md"
              size="sm"
            />
          </Box>

          {/* Grid Layouts */}
          {search ? (
            // Search result listing
            <Box className={classes.secondaryGrid}>
              {filteredTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <Box
                    key={type.id}
                    className={classes.typeCard}
                    onClick={() => handleSelectType(type.id)}
                  >
                    <div className={`${classes.iconWrapper} ${type.bgClass}`}>
                      <IconComponent size={20} />
                    </div>
                    <Text className={classes.typeName}>
                      {t(`types.${type.id}`)}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          ) : (
            // Category panels
            <>
              {/* Primary grid */}
              <Box className={classes.primaryGrid}>
                {ITEM_TYPES.filter((t) => t.isPrimary).map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <Box
                      key={type.id}
                      className={`${classes.typeCard} ${classes.typeCardPrimary}`}
                      onClick={() => handleSelectType(type.id)}
                    >
                      <div className={`${classes.iconWrapper} ${type.bgClass}`}>
                        <IconComponent size={22} />
                      </div>
                      <Text className={classes.typeName}>
                        {t(`types.${type.id}`)}
                      </Text>
                    </Box>
                  );
                })}
              </Box>

              {/* Show more toggle */}
              <Group justify="center" mt="md">
                <Button
                  variant="subtle"
                  color="indigo"
                  size="sm"
                  onClick={() => setShowMore(!showMore)}
                  rightSection={<IconChevronDown size={16} />}
                >
                  {showMore ? t("showLess") : t("showMore")}
                </Button>
              </Group>

              {/* Secondary list */}
              {showMore && (
                <Box className={classes.secondaryGrid}>
                  {ITEM_TYPES.filter((t) => !t.isPrimary).map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <Box
                        key={type.id}
                        className={classes.typeCard}
                        onClick={() => handleSelectType(type.id)}
                      >
                        <div
                          className={`${classes.iconWrapper} ${type.bgClass}`}
                        >
                          <IconComponent size={18} />
                        </div>
                        <Text className={classes.typeName}>
                          {t(`types.${type.id}`)}
                        </Text>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </>
          )}
        </Box>
      )}
    </Modal>
  );
}

export default AddItemModal;
