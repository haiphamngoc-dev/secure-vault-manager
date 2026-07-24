# DEVELOPMENT

Chào mừng bạn đến với quy trình phát triển của **Secure Vault Manager (SVM)**. Tài liệu này hướng dẫn bạn cách thiết lập môi trường phát triển cục bộ và vận hành hệ thống Monorepo một cách toàn diện.

---

## 1. Yêu Cầu Hệ Thống (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

- **Node.js** (Phiên bản `>= 18.0.0`)
- **pnpm** (Phiên bản `>= 8.0.0` - Công cụ quản lý package cho Monorepo)
- **Rust Toolchain** (Bao gồm `rustc`, `cargo` - cài đặt qua [rustup.rs](https://rustup.rs))
- **wasm-pack** (Công cụ biên dịch Rust sang WebAssembly - tải tại [rustwasm.github.io/wasm-pack](https://rustwasm.github.io/wasm-pack/installer/))
- **Tauri Dependencies**: Tùy thuộc vào hệ điều hành của bạn, hãy cài đặt các thư viện hệ thống cần thiết theo [Tauri Cài đặt](https://tauri.app/start/prerequisites/).
  - Đối với Linux (Ubuntu/Debian), hãy cài đặt thêm các thư viện GStreamer sau để tránh các lỗi WebView liên quan đến đồ họa và âm thanh (như thiếu `appsink`):

    ```bash
    sudo apt install gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad
    ```

---

## 2. Cơ Cấu Thư Mục Monorepo

Dự án được tổ chức dưới dạng Monorepo sử dụng **pnpm workspaces** và **Cargo workspaces**:

```text
secure-vault-manager/
├── Cargo.toml                   # Root Cargo Workspace (Quản lý các crate Rust)
├── pnpm-workspace.yaml          # Định nghĩa các package TypeScript/Node
├── scripts/
│   └── clean.js                 # Script dọn dẹp thư mục build tạm
└── packages/
    ├── desktop/                 # Ứng dụng Desktop (React + Mantine v9 + Tauri V2)
    ├── extension/               # Browser Extension (Manifest V3 cho Chrome/Firefox)
    ├── shared/                  # Code TypeScript dùng chung (types, utils)
    └── crypto-wasm/             # Module mã hóa & TOTP bằng Rust biên dịch sang WebAssembly
```

---

## 3. Kiến Trúc Giao Tiếp Extension & Desktop App

Secure Vault Manager sử dụng **Local Loopback REST API (`http://127.0.0.1:12519`)** với mã hóa **End-to-End Encryption (AES-256-GCM)** cho mọi giao tiếp giữa Browser Extension và Desktop App:

- **Tương thích 100% Snap & Flatpak:** Do sử dụng kết nối TCP Loopback `127.0.0.1`, Extension hoạt động hoàn hảo trên mọi môi trường trình duyệt Linux (APT, Snap, Flatpak) mà không gặp rào cản Sandbox AppArmor.
- **Tốc độ cực nhanh (< 1-3ms):** Kết nối trực tiếp với Server Axum HTTP siêu nhẹ chạy ngầm trong ứng dụng Desktop.
- **Bảo mật tuyệt đối:** Mọi yêu cầu/phản hồi dữ liệu qua `/rpc` đều được mã hóa bằng AES-256-GCM với chìa khóa đối xứng derive từ **Pairing Token**. Mỗi request có 12-byte IV ngẫu nhiên riêng chống hoàn toàn Replay Attack.

---

## 4. Thiết Lập Môi Trường Phát Triển Cục Bộ

Thực hiện các bước sau theo thứ tự để khởi động dự án lần đầu tiên:

### Bước 1: Cài đặt Dependencies

Chạy lệnh sau tại thư mục gốc để tải và thiết lập các symlink cho workspace:

```bash
pnpm install
```

### Bước 2: Khởi tạo module WebAssembly

Biên dịch mã nguồn Rust trong `packages/crypto-wasm` sang định dạng WebAssembly:

```bash
pnpm run build:wasm
```

### Bước 3: Khởi chạy Ứng dụng Desktop

```bash
pnpm dev:desktop
```

### Bước 4: Biên dịch và Nạp Browser Extension

Biên dịch Extension cho Chrome và Firefox:

```bash
pnpm --filter extension build
```

Sau đó:

- Trên Chrome: Vào `chrome://extensions` $\rightarrow$ Đật **Developer mode** $\rightarrow$ Chọn **Load unpacked** $\rightarrow$ Chọn thư mục `packages/extension/dist/chrome`.
- Trên Firefox: Vào `about:debugging#/runtime/this-firefox` $\rightarrow$ Chọn **Load Temporary Add-on...** $\rightarrow$ Chọn tệp `packages/extension/dist/firefox/manifest.json`.

---

## 5. Các Lệnh Vận Hành Dự Án (Scripts)

Tất cả các lệnh điều phối dự án đều được chạy từ thư mục gốc:

| Lệnh                            | Chức năng                                                                                |
| :------------------------------ | :--------------------------------------------------------------------------------------- |
| `pnpm dev:desktop`              | Khởi chạy ứng dụng Desktop (Tauri) trong chế độ phát triển (Live reload)                 |
| `pnpm build:desktop`            | Build gói cài đặt sản phẩm cho ứng dụng Desktop (Tauri)                                  |
| `pnpm build:wasm`               | Biên dịch Rust `crypto-wasm` sang WebAssembly                                            |
| `pnpm --filter extension dev`   | Khởi chạy Extension ở chế độ phát triển (Vite watch mode)                                |
| `pnpm --filter extension build` | Biên dịch Browser Extension ra thư mục `dist/chrome` và `dist/firefox`                  |
| `pnpm lint`                     | Chạy công cụ ESLint kiểm tra lỗi cú pháp và định dạng trên toàn Monorepo                 |
| `pnpm format`                   | Định dạng lại mã nguồn bằng Prettier trên toàn bộ dự án                                  |
| `pnpm clean`                    | Dọn dẹp toàn bộ thư mục build tạm của Rust (target), frontend (dist/pkg) và node_modules |

---

## 6. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### Lỗi 1: `Module not found: Can't resolve '@secure-vault/crypto-wasm'`

- **Nguyên nhân:** Chưa biên dịch WebAssembly hoặc các tệp pkg bị thiếu.
- **Cách khắc phục:** Chạy `pnpm run build:wasm` để tạo lại tệp JavaScript và kiểu dữ liệu TypeScript trong `packages/crypto-wasm/pkg`.

### Lỗi 2: Extension báo "Cannot connect to desktop application"

- **Nguyên nhân:** Ứng dụng Desktop chưa khởi chạy hoặc cổng HTTP `12519` bị ứng dụng khác chiếm dụng.
- **Cách khắc phục:**
  1. Khởi động ứng dụng Desktop (`pnpm dev:desktop`).
  2. Đảm bảo ứng dụng Desktop đang hoạt động trên khay hệ thống (System Tray).

### Lỗi 3: Extension báo "Mã kết nối không chính xác"

- **Nguyên nhân:** Pairing Token trong Extension không trùng khớp với mã trên Desktop App (hoặc mã đã bị reset).
- **Cách khắc phục:** Mở Cài đặt trên ứng dụng Desktop $\rightarrow$ Bắt cặp Extension $\rightarrow$ Sao chép Pairing Key mới và dán vào Extension.
