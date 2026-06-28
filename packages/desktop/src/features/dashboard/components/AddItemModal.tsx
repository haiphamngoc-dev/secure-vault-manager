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
interface CustomField {
  id: string;
  label: string;
  value: string;
  type: "text" | "password" | "date" | "url" | "email" | "phone";
}

interface AddItemModalProps {
  opened: boolean;
  onClose: () => void;
}

// 22 Predefined Item Type Templates
const ITEM_TYPES = [
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
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
    bgClass: classes.bgGeneric,
    isPrimary: false,
    fields: [
      { name: "ssid", labelKey: "SSID/Network Name", type: "text" },
      { name: "wifiPassword", labelKey: "Wi-Fi Password", type: "password" },
      { name: "adminUser", labelKey: "Admin Username", type: "text" },
      { name: "adminPassword", labelKey: "Admin Password", type: "password" },
    ],
  },
];

export function AddItemModal({ opened, onClose }: Readonly<AddItemModalProps>) {
  const { t } = useTranslation();
  const { addItem } = useVault();

  // Selection states
  const [search, setSearch] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [websites, setWebsites] = useState<string[]>([""]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const activeType = ITEM_TYPES.find((type) => type.id === selectedType);

  const resetForm = () => {
    setSearch("");
    setShowMore(false);
    setSelectedType(null);
    setTitle("");
    setFieldValues({});
    setWebsites([""]);
    setCustomFields([]);
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
  };

  // Add website input
  const handleAddWebsite = () => {
    setWebsites([...websites, ""]);
  };

  const handleWebsiteChange = (index: number, val: string) => {
    const updated = [...websites];
    updated[index] = val;
    setWebsites(updated);
  };

  const handleRemoveWebsite = (index: number) => {
    setWebsites(websites.filter((_, idx) => idx !== index));
  };

  // Custom fields
  const handleAddCustomField = (
    type: "text" | "password" | "date" | "url" | "email" | "phone"
  ) => {
    const newField: CustomField = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9),
      label: "",
      value: "",
      type,
    };
    setCustomFields([...customFields, newField]);
  };

  const handleCustomFieldChange = (
    id: string,
    key: "label" | "value",
    val: string
  ) => {
    setCustomFields(
      customFields.map((field) =>
        field.id === id ? { ...field, [key]: val } : field
      )
    );
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter((field) => field.id !== id));
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

    // Capture standard form fields mapping
    const username = fieldValues.username || "";
    const password = fieldValues.password || "";
    const url =
      selectedType === "Login" ? websites[0] : fieldValues.server || "";

    addItem({
      title,
      category: selectedType || "Login",
      username: username || undefined,
      password: password || undefined,
      url: url || undefined,
      notes: notes || undefined,
      customFields: customFields.length > 0 ? customFields : undefined,
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

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      withCloseButton={false}
      size={selectedType ? "lg" : "xl"}
      radius="lg"
      overlayProps={{
        blur: 10,
        backgroundOpacity: 0.5,
      }}
      styles={{
        content: {
          backgroundColor: "rgba(26, 27, 30, 0.95)",
          border: "1px solid var(--mantine-color-dark-4)",
        },
      }}
    >
      {/* Dynamic Modal Body */}
      {!selectedType ? (
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
              size="md"
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
      ) : (
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
            <Title order={3} className={classes.modalTitle}>
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
              <div className={classes.dropdownIndicator}>
                <IconChevronDown size={10} color="gray" />
              </div>
            </div>
            <TextInput
              placeholder={t("enterTitle")}
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              className={classes.titleInput}
              radius="md"
              size="md"
              required
            />
          </Box>

          {/* Dynamic template inputs */}
          {activeType && activeType.fields.length > 0 && (
            <Box className={classes.formSection}>
              {activeType.fields.map((field) => (
                <Box key={field.name} mb="md">
                  {field.type === "password" ? (
                    <PasswordInput
                      label={t(field.labelKey)}
                      placeholder={t(field.labelKey)}
                      value={fieldValues[field.name] || ""}
                      onChange={(e) =>
                        setFieldValues({
                          ...fieldValues,
                          [field.name]: e.currentTarget.value,
                        })
                      }
                      radius="md"
                    />
                  ) : field.type === "textarea" ? (
                    <Textarea
                      label={t(field.labelKey)}
                      placeholder={t(field.labelKey)}
                      value={fieldValues[field.name] || ""}
                      onChange={(e) =>
                        setFieldValues({
                          ...fieldValues,
                          [field.name]: e.currentTarget.value,
                        })
                      }
                      radius="md"
                      rows={3}
                    />
                  ) : (
                    <TextInput
                      label={t(field.labelKey)}
                      placeholder={t(field.labelKey)}
                      type={field.type}
                      value={fieldValues[field.name] || ""}
                      onChange={(e) =>
                        setFieldValues({
                          ...fieldValues,
                          [field.name]: e.currentTarget.value,
                        })
                      }
                      radius="md"
                    />
                  )}
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
                <Box key={idx} className={classes.websiteRow}>
                  <TextInput
                    placeholder="https://example.com"
                    value={web}
                    onChange={(e) =>
                      handleWebsiteChange(idx, e.currentTarget.value)
                    }
                    leftSection={<IconGlobe size={16} />}
                    radius="md"
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

          {/* Dynamic custom fields section */}
          {customFields.length > 0 && (
            <Box className={classes.formSection}>
              {customFields.map((field) => (
                <Box key={field.id} className={classes.customFieldRow}>
                  <TextInput
                    placeholder="Field name"
                    value={field.label}
                    onChange={(e) =>
                      handleCustomFieldChange(
                        field.id,
                        "label",
                        e.currentTarget.value
                      )
                    }
                    radius="md"
                    className={classes.customFieldLabel}
                  />
                  {field.type === "password" ? (
                    <PasswordInput
                      placeholder="Password"
                      value={field.value}
                      onChange={(e) =>
                        handleCustomFieldChange(
                          field.id,
                          "value",
                          e.currentTarget.value
                        )
                      }
                      radius="md"
                      className={classes.customFieldValue}
                    />
                  ) : (
                    <TextInput
                      placeholder="Value"
                      type={field.type}
                      value={field.value}
                      onChange={(e) =>
                        handleCustomFieldChange(
                          field.id,
                          "value",
                          e.currentTarget.value
                        )
                      }
                      radius="md"
                      className={classes.customFieldValue}
                    />
                  )}
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleRemoveCustomField(field.id)}
                    mb={4}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Box>
              ))}
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
              rows={4}
            />
          </Box>

          {/* Location Mock Button */}
          <Group mb="md">
            <Button
              variant="subtle"
              color="indigo"
              size="xs"
              leftSection={<IconPlus size={14} />}
            >
              {t("addLocation")}
            </Button>
          </Group>

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
      )}
    </Modal>
  );
}

export default AddItemModal;
