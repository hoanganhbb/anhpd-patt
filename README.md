# Phiếu công việc

Ứng dụng quản trị danh sách công việc (MantisBT REST API) — Next.js 16 (App Router, Turbopack), MUI 9, axios, Vitest, ESLint 10, Prettier.

## Chạy

```bash
npm install
cp .env.example .env.local   # sửa MANTIS_BASE_URL
npm run dev                  # http://localhost:3000
```

Vào **Quản trị API-KEY** (`/settings`) để nhập API-KEY, sau đó bấm **Kiểm tra API-KEY**.

## Cấu hình

- `MANTIS_BASE_URL` (trong `.env.local`): địa chỉ máy chủ Mantis. Đổi giá trị cần khởi động lại `npm run dev`.
- API-KEY lưu trong `data/token.txt` (quyền `600`, thư mục `data/` đã được bỏ qua trong git). Có thể sửa file trực tiếp hoặc qua trang `/settings` (đọc, ghi, xoá, kiểm tra).
- `DATA_DIR` (tuỳ chọn): đổi thư mục chứa `token.txt`.
- Trình duyệt không bao giờ thấy API-KEY: mọi request đi qua `/api/proxy/*`, server gắn header `API-KEY: <key>` rồi chuyển tiếp tới Mantis.

## Chức năng

| Trang          | Nội dung                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `/`            | Danh sách công việc: lọc theo dự án, bộ lọc, trạng thái, tìm kiếm, phân trang                   |
| `/issues/new`  | Tạo công việc                                                                                   |
| `/issues/[id]` | Chi tiết, cập nhật trạng thái/người xử lý/ưu tiên, ghi chú, tệp, theo dõi, ghim, nhắc việc, xoá |
| `/api-test`    | Chạy thử từng API trong `RequestServices` với tham số JSON                                      |
| `/settings`    | Quản trị API-KEY                                                                                |

## Scripts

```bash
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck      # next typegen + tsc
npm test               # unit test (Vitest)
npm run test:api       # chạy thật các API đọc (API-KEY trong data/, URL trong .env.local)
API_TEST_WRITE=1 npm run test:api   # thêm API ghi: tạo phiếu test, sửa, rồi xoá
```

Kết quả chạy thật được ghi vào `data/api-report.json`.
