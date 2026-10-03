@AGENTS.md

# Phong cách UI

Giao diện dùng **Chakra UI v3** (không dùng MUI hay thư viện UI khác), icon từ `react-icons/lu` (Lucide). Phong cách: sạch, sáng, nhấn teal, bo góc mềm, bóng nhẹ, mật độ thông tin vừa phải. Mọi chữ hiển thị là tiếng Việt; comment code viết tiếng Anh.

## Tạo page mới (bắt buộc đọc trước khi viết page)

Page mới phải **ghép từ khối dựng sẵn và theo cấu trúc của page mẫu cùng loại**, không tự thiết kế lại. Quy trình:

1. Xác định loại page trong bảng dưới, **mở page mẫu tương ứng và đi theo đúng cấu trúc của nó**.
2. Chỉ dùng khối trong mục "Khối dựng sẵn". Khi cần khối mới mà nó sẽ lặp lại ở page khác, tạo component dùng chung trong `src/components/` (hoặc `src/components/ui/` nếu là khối giao diện thuần), không viết cục bộ trong page.
3. Nếu page cần vào menu: thêm vào `NAV_GROUPS` trong `src/components/AppShell.tsx` (nhãn tiếng Việt + icon Lucide).
4. Đi hết checklist cuối mục.

| Loại page               | Page mẫu                         | Khung                                                                                                                                                                               |
| ----------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Danh sách có lọc + bảng | `src/app/page.tsx`               | `PageHeader` (actions: `RefreshButton`, nút tạo) → `ApiErrorAlert` → tab `enclosed` → card: hàng lọc, `LoadingBar`, `Table`, phân trang                                             |
| Chi tiết một đối tượng  | `src/app/issues/[id]/page.tsx`   | breadcrumb → tiêu đề có vạch brand + `Pill`/chip meta + actions → lưới `minmax(0,1fr) 360px`: trái là các `Panel` nội dung, phải (sticky) là `Panel` thao tác + `InfoRow`/`DateRow` |
| Form tạo/sửa            | `src/app/issues/new/page.tsx`    | `<Box as="form">` → `PageHeader` (actions: Huỷ + nút submit `loading`) → lưới `2fr 1fr` hai `Panel` (nội dung / phân loại), mỗi ô dùng `Field`/`SelectField`/Combobox               |
| Thống kê / dashboard    | `src/app/reports/page.tsx`       | `PageHeader` (bộ lọc + `RefreshButton`) → `ApiErrorAlert` → `LoadingBar` → hàng `StatCard` (grid 2/4 cột) → các `Panel` biểu đồ                                                     |
| Quy trình nhiều bước    | `src/app/issues/import/page.tsx` | `PageHeader` → mỗi bước một `Panel` với `icon={<StepNumber n={1} />}` (`src/components/ui/step-number.tsx`)                                                                         |
| Cấu hình / cài đặt      | `src/app/settings/page.tsx`      | `PageHeader` → cột `maxWidth="760px"`, mỗi nhóm một `Panel` (icon + title + description)                                                                                            |

Khung dữ liệu chuẩn (theo page danh sách):

```tsx
'use client'
export default function XxxPage() {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{ key: string; items: Item[]; error: string }>()
  // "Đang tải" = chưa có kết quả cho đúng bộ tham số hiện tại.
  const queryKey = JSON.stringify({ /* filters */ reload })
  const loading = result?.key !== queryKey

  useEffect(() => {
    let active = true
    RequestServices.getXxx({ /* filters */ })
      .then(res => active && setResult({ key: queryKey, items: res.items ?? [], error: '' }))
      .catch(err => active && setResult({ key: queryKey, items: [], error: getErrorMessage(err) }))
    return () => { active = false }
  }, [queryKey])

  return (
    <>
      <PageHeader title="…" subtitle="…" actions={<RefreshButton onClick={() => setReload(n => n + 1)} />} />
      <ApiErrorAlert error={result?.error} mb="4" />
      <LoadingBar loading={loading} mb="4" />
      <Panel icon={<LuXxx />} title="…" actions={…}>…</Panel>
    </>
  )
}
```

- Gọi API chỉ qua `RequestServices` (`src/services/requestServices.ts`); method mới phải thêm vào `API_CATALOG` (`src/services/apiCatalog.ts`) — test bắt buộc điều này.
- Thao tác ghi: `busy` state, nút `disabled={busy}`/`loading`, xong thì `notify('success' | 'error', …)` rồi tải lại dữ liệu.

### Khối dựng sẵn

| Cần                                                 | Dùng                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Tiêu đề trang                                       | `PageHeader`                                                                                                     |
| Khối nội dung có tiêu đề                            | `Panel` (`icon`, `title`, `description`, `actions`, `bodyProps`) / `PanelHeader` — `src/components/ui/panel.tsx` |
| Lỗi tải dữ liệu (tự gợi ý cấu hình API-KEY khi 428) | `ApiErrorAlert`                                                                                                  |
| Đang tải lại / tiến độ                              | `LoadingBar` (`value` cho tiến độ xác định), `Skeleton` khi tải lần đầu                                          |
| Nút tải lại                                         | `RefreshButton`                                                                                                  |
| Thông báo kết quả thao tác                          | `notify()` từ `src/components/ui/toaster.tsx`                                                                    |
| Thông báo trong trang                               | `Alert` (`src/components/ui/alert.tsx`, có `action`, `onClose`)                                                  |
| Ô nhập có nhãn                                      | `Field` + `Input`/`Textarea` (`bg="bg.panel"`)                                                                   |
| Chọn từ danh sách ngắn                              | `SelectField` (option có `render` để hiện icon/avatar)                                                           |
| Chọn có tìm kiếm                                    | `ProjectSelect`, `CategorySelect`, `UserSelect`                                                                  |
| Số liệu tổng hợp                                    | `StatCard` (`colorPalette`)                                                                                      |
| Thuộc tính dạng "nhãn – giá trị"                    | `InfoRow`, `DateRow` (`src/components/ui/info-row.tsx`)                                                          |
| Giá trị meta cạnh tiêu đề                           | `Pill`, `StatusChip`, `PriorityBadge`                                                                            |
| Người dùng                                          | `PersonLabel` (avatar + tên), `UserAvatar`                                                                       |
| Trống / không tìm thấy                              | `EmptyState` của Chakra (icon + title + description + nút quay lại)                                              |
| Gợi ý khi rê chuột                                  | `Tooltip` (`src/components/ui/tooltip.tsx`)                                                                      |

### Checklist trước khi xong

- [ ] Cấu trúc khớp page mẫu cùng loại; không có card/tiêu đề/alert/loading tự chế.
- [ ] Không mã màu cứng cho nền/chữ/viền; không `Card.Root` kèm style riêng (dùng `Panel`).
- [ ] Có trạng thái: đang tải, lỗi, rỗng, không có quyền.
- [ ] Chữ tiếng Việt, icon Lucide, nhãn nút là động từ ("Lưu thay đổi", "Tạo công việc").
- [ ] Đúng ở 390px và 1440px, sáng và tối; console không lỗi/cảnh báo.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npx prettier --check src` đều qua.

## Theme và token (`src/theme.ts`)

- Màu chủ đạo là palette `brand` (teal). `html` đã đặt `colorPalette: 'brand'`, nên component tự dùng brand; chỉ set `colorPalette` khi cần màu khác (`green` cho hành động hoàn tất, `red` cho xoá/lỗi, `orange` cảnh báo, `gray` cho nút phụ/icon button).
- Chỉ dùng token ngữ nghĩa, không viết mã màu cứng cho nền/chữ/viền:
  - Nền: `bg` (nền trang), `bg.panel` (card, input, top bar), `bg.sidebar`, `bg.muted`/`bg.subtle` (vùng phụ, hover).
  - Chữ: `fg`, `fg.muted` (nhãn, mô tả), `fg.subtle` (giá trị trống "—", gợi ý).
  - Viền: `border`, `border.emphasized` (hover).
  - Brand: `brand.solid`, `brand.fg`, `brand.subtle`, `brand.muted`, `brand.contrast`.
- Bo góc theo token: `l1` 6px (chip nhỏ, tag), `l2` 10px (nút, input, item), `l3` 12px (card, dialog). Pill dùng `full`.
- Bóng: `soft` (card, đã gán qua recipe), `lifted` (phần tử nổi như tab đang chọn).
- Phải chạy đúng ở cả chế độ sáng và tối. Màu tuỳ biến phải khai báo dạng `{ _light, _dark }`.
- Trạng thái disabled vẫn phải đọc được (layerStyle `disabled` có opacity 0.7, đừng làm mờ thêm).

## Layout

- `AppShell`: sidebar cố định 260px (ẩn thành Drawer trên mobile), top bar 64px nền `bg.panel` (gồm tìm kiếm, thông báo, trợ giúp, menu người dùng có chọn giao diện), nội dung `maxWidth="1400px"`, padding `4`/`6`.
- Trang danh sách/công cụ mở đầu bằng `PageHeader` (title, subtitle, actions bên phải).
- Trang chi tiết: breadcrumb → tiêu đề có vạch `brand.solid` bên trái + hàng chip meta → lưới 2 cột `minmax(0, 1fr) 360px`, cột phải `position: sticky` (`top: 84px`) trên `lg`.
- Khoảng cách giữa các khối: `gap="5"`; trong card: `gap="3"`–`"4"`.
- Luôn kiểm tra ở 390px: cột chuyển thành 1, hàng ngang cho phép `wrap`, chữ dài `truncate`/`lineClamp`, thông tin phụ (thời gian, nhãn) chuyển xuống dòng thay vì chiếm cột.

## Component và quy ước

- Khối nội dung: `Panel` (bên dưới là `<Card.Root variant="outline">`; recipe đã lo nền, viền, bóng, bo góc — không truyền lại `bg`/`boxShadow`/`borderRadius`). Header = icon `brand.fg` + tiêu đề + hành động phụ bên phải (nút `size="sm" variant="outline"`).
- Chọn có tìm kiếm dùng Combobox theo mẫu `ProjectSelect`/`CategorySelect`/`UserSelect`: lọc **không dấu** bằng `matchesText` (`src/lib/text.ts`), không dùng `useFilter` của Chakra (không xử lý "đ").
- Trạng thái phiếu: `StatusChip` (pill có chấm màu, chữ đậm hơn nền để đủ tương phản). Ưu tiên: `PriorityBadge`. Người: `UserAvatar` (màu ổn định theo tên) + tên.
- Bảng: `Table.Root interactive` trong `Table.ScrollArea`, header chữ nhỏ `fg.muted` (đã có trong recipe).
- Tab: `variant="enclosed"` (segmented) cho bộ lọc; `variant="line"` với indicator `brand.solid` trong card.
- Thông báo kết quả thao tác dùng `notify(...)`; lỗi tải trang dùng `ApiErrorAlert` hoặc `EmptyState`. Đang tải dùng `LoadingBar`/`Skeleton`, không để trang trống.
- Hành động nguy hiểm (xoá) đặt trong menu "⋯", màu `fg.error`, có xác nhận.
- Ẩn/khoá hành động theo quyền thật từ `api/rest/permission/:id` (`can_update`, `can_assign`, `can_change_status`, `can_delete`…); khi không có quyền sửa, hiện ghi chú "chỉ có quyền xem" thay vì để form mờ.
- Không hiển thị dữ liệu giả (vai trò, chấm thông báo…): chỉ hiển thị cái API thật sự trả về.
- Thẻ tương tác phải đúng HTML: không đặt `div`/`p` trong `button` (dùng `as="span"`), link dùng `NextLink` qua `asChild`.

## Kỹ thuật

- `Provider` bọc `EmotionRegistry` (đưa CSS vào `<head>` khi SSR). Đừng bỏ, nếu không sẽ lỗi hydration.
- Giá trị phụ thuộc thời gian/trình duyệt (`Date.now()`, theme) không render khác nhau giữa server và client: dùng `useState(() => …)`, `ClientOnly` hoặc `suppressHydrationWarning`.
- Sau khi đổi UI: chạy `npm run typecheck`, `npm run lint`, `npm test`, và mở trang thật (sáng/tối, desktop/mobile) để kiểm tra console không có lỗi.
