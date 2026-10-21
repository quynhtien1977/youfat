## Summary / Mục đích PR
<!-- Mô tả ngắn gọn tính năng mới, lỗi được xử lý hoặc refactor -->

## Phân loại Vai trò (theo AGENTS.md)
- [ ] **Visual UI (Antigravity)**: layout, CSS, responsive, measurement, component styling YouPass 1:1.
- [ ] **Backend / Domain logic (Codex/GPT)**: schema, grading engine, storage, validation, test suite.
- [ ] **Mixed UI + Logic**: Codex xác lập contract và test trước, Anti tích hợp và nghiệm thu giao diện.

## Thay đổi chính
- 

## Quality Gates Checklist
- [ ] `npx tsc --noEmit`: 0 lỗi TypeScript
- [ ] `npm run lint`: 0 lỗi ESLint
- [ ] `npm test`: tất cả unit & integration tests đều PASS (234/234 tests)
- [ ] `npm run build`: Production bundle build thành công
- [ ] `git diff --check`: Không có lỗi whitespace hay conflict markers
- [ ] Không tự động chạy git commit/push bởi AI agent

## Bằng chứng Responsive (đối với thay đổi UI)
<!-- Bắt buộc đo thực tế trên browser dev server, kiểm tra overflow ngang -->
| Viewport | innerWidth | scrollWidth | Overflow ngang | Đã xem trực quan |
|---|---|---|---|---|
| **320px** (Mobile) | 320px | 320px | 0px | [ ] |
| **768px** (Tablet) | 768px | 768px | 0px | [ ] |
| **1024px** (Desktop) | 1024px | 1024px | 0px | [ ] |

## Tài liệu bàn giao / Handoff
- Link file handoff: `docs/handoffs/<task-slug>.md`
