# CONTRIBUTING

Trước hết, xin cảm ơn bạn đã quan tâm và muốn đóng góp mã nguồn cho **Secure Vault Manager (SVM)**! Để dự án luôn duy trì được chất lượng cao và quy trình cộng tác chuyên nghiệp, hãy vui lòng tuân thủ các quy tắc hướng dẫn dưới đây.

---

## 1. Quy Trình Làm Việc Với Nhánh Git (Git Branching Model)

Dự án áp dụng quy trình phát triển dựa trên nhánh (Branch-based development). Vui lòng **không** commit trực tiếp lên nhánh `main`.

- **Tên nhánh bắt buộc** tuân theo cấu trúc: `<type>/<scope>/<mô-tả-ngắn>`
- **Các `type` hợp lệ:**
  - `feature/`: Bổ sung tính năng mới.
  - `bugfix/`: Sửa lỗi cho các tính năng hiện tại.
  - `hotfix/`: Sửa lỗi khẩn cấp trực tiếp cho môi trường production.
  - `docs/`: Cập nhật tài liệu hướng dẫn.
  - `refactor/`: Tái cấu trúc mã nguồn không làm thay đổi tính năng.
- **Các `scope` hợp lệ** (phù hợp với cấu trúc Monorepo):
  - `desktop`: Ứng dụng Desktop (Tauri/React).
  - `extension`: Browser Extension.
  - `proxy`: Native Messaging Proxy (Rust).
  - `shared`: Thư viện TypeScript dùng chung.
  - `crypto-wasm`: Thư viện mã hóa WebAssembly (Rust).
  - `root`: Cấu hình ở thư mục gốc hoặc CI/CD.

_Ví dụ:_

- `feature/desktop/add-vault-locking-timer`
- `bugfix/proxy/fix-stdio-read-blocking`
- `docs/root/update-installation-instructions`

---

## 2. Quy Chuẩn Commit Message (Conventional Commits)

Chúng tôi sử dụng tiêu chuẩn **Conventional Commits** để tự động phân tích và tạo nhật ký thay đổi (changelog). Mỗi commit message phải có định dạng:

```text
<type>(<scope>): <mô tả ngắn bằng tiếng Anh hoặc tiếng Việt dạng câu mệnh lệnh>
```

### Chi tiết các loại `type`

- **`feat`**: Một tính năng mới cho người dùng.
- **`fix`**: Sửa một lỗi kỹ thuật.
- **`docs`**: Chỉ thay đổi tài liệu.
- **`style`**: Định dạng code (khoảng trắng, dấu chấm phẩy, format thụt lề...).
- **`refactor`**: Thay đổi code nhưng không sửa lỗi cũng không thêm tính năng.
- **`perf`**: Thay đổi mã nguồn nhằm cải tiến hiệu năng.
- **`test`**: Bổ sung hoặc sửa đổi các bộ test tự động.
- **`chore`**: Thay đổi hệ thống build, CI/CD, hoặc cập nhật dependency.

### Các scope tương ứng trong Monorepo

Hãy sử dụng một trong các scope: `desktop`, `extension`, `proxy`, `shared`, `crypto-wasm`, `root`.

_Ví dụ commit đúng:_

- `feat(desktop): implement idle auto lock screen`
- `fix(proxy): resolve socket connection timeout on windows`
- `refactor(crypto-wasm): optimize PBKDF2 iterations using rust crypto`
- `chore(root): update eslint to version 9`

---

## 3. Tiêu Chuẩn Chất Lượng Mã Nguồn (Code Quality Standards)

Trước khi gửi Pull Request (PR) hoặc đẩy code lên remote, bạn bắt buộc phải kiểm tra mã nguồn bằng các lệnh cục bộ để đảm bảo chất lượng:

### Đối với Frontend (React, TypeScript, CSS)

1. **Kiểm tra cú pháp và lỗi tiềm ẩn (Linter):**

   ```bash
   pnpm lint
   ```

   _Yêu cầu:_ Lệnh phải chạy thành công không có bất kỳ cảnh báo hoặc lỗi nào (`0 errors, 0 warnings`).

2. **Định dạng code (Formatter):**

   ```bash
   pnpm format
   ```

   _Yêu cầu:_ Đảm bảo toàn bộ tệp tin đã được Prettier định dạng đồng nhất.

### Đối với Backend & Module Rust (`proxy`, `crypto-wasm`, `desktop/src-tauri`)

1. **Định dạng mã nguồn Rust:**

   ```bash
   cargo fmt --all
   ```

2. **Kiểm tra biên dịch và tối ưu code:**

   ```bash
   cargo clippy --all-targets -- -D warnings
   ```

   _Yêu cầu:_ Mã nguồn Rust không được chứa cảnh báo biên dịch nào.

---

## 4. Quy Trình Gửi Pull Request (PR)

Khi tính năng của bạn đã hoàn thành và kiểm thử thành công cục bộ:

1. **Đẩy nhánh lên remote:** Đẩy nhánh git của bạn lên GitHub.
2. **Tạo Pull Request:** Trỏ nhánh của bạn về nhánh `main` của repo gốc.
3. **Điền thông tin PR:**
   - Ghi rõ PR này giải quyết Issue nào (ví dụ: `Closes #123`).
   - Mô tả ngắn gọn những thay đổi chính mà bạn đã làm.
   - Gửi ảnh chụp màn hình hoặc video nếu PR thay đổi giao diện (UI/UX).
4. **Đợi xét duyệt (Review):**
   - Các bộ CI/CD tự động sẽ chạy để kiểm tra khả năng build và lint.
   - Cần có tối thiểu **1 sự phê duyệt (Approval)** từ người quản trị dự án (Code Owner) để được phép merge vào nhánh `main`.

Một lần nữa, xin cảm ơn sự đóng góp của bạn để dự án Secure Vault Manager ngày càng hoàn thiện và bảo mật hơn!
