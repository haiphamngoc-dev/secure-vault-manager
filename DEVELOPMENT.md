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
│   └── copy-sidecar.js          # Script tự động copy proxy sang binaries của desktop
└── packages/
    ├── desktop/                 # Ứng dụng Desktop (React + Tauri backend)
    ├── extension/               # Browser Extension (Manifest V3 cho Chrome/Firefox)
    ├── shared/                  # Code TypeScript dùng chung (types, Wasm wrappers)
    ├── crypto-wasm/             # Module mã hóa bằng Rust biên dịch sang WebAssembly
    └── proxy/                   # Native Messaging Proxy viết bằng Rust
```

---

## 3. Thiết Lập Môi Trường Phát Triển Cục Bộ

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

_Lưu ý:_ Dự án đã được tạo sẵn cấu trúc stub (pkg placeholder) giúp bạn có thể bỏ qua bước này ở lần đầu chạy thử nếu chưa cài đặt `wasm-pack`.

### Bước 3: Biên dịch và thiết lập Proxy Sidecar

Ứng dụng Tauri Desktop yêu cầu tệp thực thi của `proxy` nằm trong thư mục binaries của nó. Hãy chạy chuỗi lệnh sau:

```bash
# Biên dịch proxy viết bằng Rust
pnpm run build:proxy

# Copy proxy vào đúng thư mục binaries của desktop với định dạng target triple của OS
pnpm run copy:sidecar
```

---

## 4. Các Lệnh Vận Hành Dự Án (Scripts)

Tất cả các lệnh điều phối dự án đều được chạy từ thư mục gốc:

| Lệnh                            | Chức năng                                                                                |
| :------------------------------ | :--------------------------------------------------------------------------------------- |
| `pnpm dev:desktop`              | Khởi chạy ứng dụng Desktop (Tauri) trong chế độ phát triển (Live reload)                 |
| `pnpm build:desktop`            | Build gói cài đặt sản phẩm cho ứng dụng Desktop (Tauri)                                  |
| `pnpm --filter extension dev`   | Khởi chạy Extension ở chế độ phát triển (Vite watch mode)                                |
| `pnpm --filter extension build` | Biên dịch Browser Extension ra thư mục `dist/`                                           |
| `pnpm lint`                     | Chạy công cụ ESLint kiểm tra lỗi cú pháp và định dạng trên toàn Monorepo                 |
| `pnpm format`                   | Định dạng lại mã nguồn bằng Prettier trên toàn bộ dự án                                  |
| `pnpm clean`                    | Dọn dẹp toàn bộ thư mục build tạm của Rust (target), frontend (dist/pkg) và node_modules |

---

## 5. Cấu Hình Browser Native Messaging Host (Đặc thù)

Để Browser Extension có thể giao tiếp được với ứng dụng Desktop, trình duyệt cần biết vị trí của ứng dụng proxy trung gian thông qua một tệp cấu hình JSON đăng ký trên hệ điều hành.

### Cách 1: Đăng ký tự động qua Script (Khuyến nghị)

Sau khi nạp Extension và lấy được **Extension ID** trên trình duyệt (ví dụ: `gkdjgnbkoongjmehhdecofdhlcajgggj`), bạn chỉ cần chạy lệnh sau từ thư mục gốc của dự án:

```bash
pnpm run register-proxy <ID_EXTENSION_CỦA_BẠN>
```

_Tác dụng:_ Script sẽ tự động nhận diện hệ điều hành, tạo tệp cấu hình JSON với đường dẫn tuyệt đối chuẩn xác, và sao chép/đăng ký vào đúng thư mục cấu hình trình duyệt (hoặc Registry trên Windows).

### Cách 2: Đăng ký thủ công (Dành cho kiểm tra thủ công)

Nếu muốn tự cấu hình, bạn có thể thực hiện theo các bước sau:

#### Bước 1: Tạo tệp JSON cấu hình Proxy

Tạo một tệp cấu hình có tên `com.haiphamngoc_dev.secure_vault_manager_proxy.json` ở bất kỳ thư mục nào trên máy của bạn với nội dung:

```json
{
  "name": "com.haiphamngoc_dev.secure_vault_manager_proxy",
  "description": "Secure Vault Manager Native Messaging Proxy Host",
  "path": "/ĐƯỜNG_DẪN_TUYỆT_ĐỐI_ĐẾN/packages/desktop/src-tauri/binaries/proxy-TARGET_TRIPLE",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://ID_EXTENSION_CỦA_BẠN/"]
}
```

> [!IMPORTANT]
>
> 1. Thay thế phần `/ĐƯỜNG_DẪN_TUYỆT_ĐỐI_ĐẾN/` bằng đường dẫn thực tế trên máy bạn.
> 2. Sửa `proxy-TARGET_TRIPLE` thành tên file proxy thực tế đã tạo ở Bước 3 thiết lập (ví dụ: `proxy-x86_64-unknown-linux-gnu` hoặc `proxy-x86_64-pc-windows-msvc.exe`).
> 3. Thay `ID_EXTENSION_CỦA_BẠN` thành ID thực tế của Extension hiển thị trên trang `chrome://extensions` sau khi bạn nạp Extension từ thư mục `packages/extension/dist`.

#### Bước 2: Đăng ký tệp JSON cấu hình với trình duyệt

Tùy thuộc vào hệ điều hành của bạn, hãy sao chép hoặc trỏ đường dẫn đăng ký đến tệp JSON vừa tạo:

#### **Hệ điều hành Linux**

Sao chép tệp JSON vào các thư mục sau:

- **Google Chrome**: `~/.config/google-chrome/NativeMessagingHosts/`
- **Mozilla Firefox**: `~/.mozilla/native-messaging-hosts/`

_Lệnh mẫu:_

```bash
mkdir -p ~/.config/google-chrome/NativeMessagingHosts/
cp com.haiphamngoc_dev.secure_vault_manager_proxy.json ~/.config/google-chrome/NativeMessagingHosts/
```

#### **Hệ điều hành macOS**

Sao chép tệp JSON vào các thư mục sau:

- **Google Chrome**: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
- **Mozilla Firefox**: `~/Library/Application Support/Mozilla/NativeMessagingHosts/`

#### **Hệ điều hành Windows**

Tạo một Registry Key trỏ đến vị trí tệp JSON:

- **Google Chrome**: Tạo key `HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.haiphamngoc_dev.secure_vault_manager_proxy`
- Đặt giá trị mặc định (`Default`) của key này là đường dẫn tuyệt đối dẫn tới tệp cấu hình JSON của bạn trên đĩa cứng (ví dụ: `C:\path\to\com.haiphamngoc_dev.secure_vault_manager_proxy.json`).

---

## 6. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### Lỗi 1: `Module not found: Can't resolve '@secure-vault/crypto-wasm'`

- **Nguyên nhân:** Chưa biên dịch WebAssembly hoặc các tệp placeholder bị mất.
- **Cách khắc phục:** Chạy `pnpm run build:wasm` để tạo lại tệp JavaScript và kiểu dữ liệu TypeScript trong `packages/crypto-wasm/pkg`.

### Lỗi 2: Tauri báo lỗi thiếu file sidecar: `resource path binaries/proxy-... doesn't exist`

- **Nguyên nhân:** Bạn chưa biên dịch proxy hoặc chưa chạy script copy trước khi chạy ứng dụng tauri.
- **Cách khắc phục:** Chạy `pnpm run build:proxy && pnpm run copy:sidecar`.

### Lỗi 3: Extension báo "Native Messaging Host not found"

- **Nguyên nhân:** Tệp cấu hình JSON chưa được đăng ký đúng chỗ trên hệ điều hành, hoặc đường dẫn `"path"` bên trong file JSON trỏ sai file proxy thực thi.
- **Cách khắc phục:** Xem lại kỹ **Phần 5** và khởi động lại trình duyệt để cập nhật cấu hình.
