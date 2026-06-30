# Espresso Moderne — Design Pattern Guide

> Hệ thống thiết kế chính thức cho SCM-BEANS Platform.  
> Áp dụng nhất quán cho tất cả các trang: Landing Page, Dashboard, Auth, Admin.

---

## 1. Triết lý thiết kế (Design Philosophy)

| Nguyên tắc | Mô tả |
|---|---|
| **Tối giản** | Chỉ trình bày những gì cần thiết. Mỗi element phải có lý do tồn tại. |
| **Sang trọng** | Whitespace rộng rãi, typography cẩn thận, không dùng màu flashy. |
| **Cổ điển** | Serif font cho headline gợi cảm giác lịch lãm, có chiều sâu. |
| **Điềm đạm** | Không animation rối mắt — chỉ fade-in nhẹ nhàng khi scroll. |
| **Sáng sủa** | Nền chính luôn là warm-white hoặc white. Không tối. |
| **Nhất quán** | Cùng 1 token set từ Landing đến Dashboard. |

**Tham khảo layout:** [bambulab.com](https://bambulab.com/en) — Full-width hero, alternating text/image sections, minimal nav, clean footer.

---

## 2. Color Palette

```
Warm White (nền chính):     #FAFAF8   → warm-50
White (card surfaces):      #FFFFFF   → white / surface
Warm Grey (dividers):       #E8E4DE   → warm-300
Muted text:                 #7C756E   → ink-muted / warm-700
Ink (primary text):         #1A1714   → ink
Espresso 50 (accent bg):    #F5EDE4   → espresso-50
Espresso (accent):          #8B5E3C   → espresso / espresso-500
Espresso Dark:              #5A3A22   → espresso-700
Dark footer:                #1A1714   → ink (same as text)
```

**Quy tắc sử dụng màu:**
- ✅ Background: `warm-50` (page) / `white` (card)
- ✅ Accent: `espresso` (buttons, active states, rules, icons)
- ✅ Text: `ink` (heading) / `ink-muted` (body) / `warm-500` (caption)
- ✅ Border: `warm-300` (dividers, card borders)
- ❌ Không dùng `amber`, `yellow`, màu neon, hay màu rực rỡ
- ❌ Không dùng dark background cho sections (trừ footer)

---

## 3. Typography

### Font Families

| Role | Font | Class |
|---|---|---|
| **Display Heading** | Playfair Display (serif) | `font-display` |
| **Body / UI** | Inter (sans-serif) | `font-sans` |
| **Data / Code / Labels** | JetBrains Mono | `font-mono` |

### Scale & Usage

```css
/* Section heading */
.em-heading — font-display, tracking-tight, text-ink
Sizes: text-3xl → text-5xl (responsive)

/* Overline label (above headings) */
.em-overline — font-sans, uppercase, tracking-label, text-espresso, text-[11px]

/* Body text */
.em-body — font-sans, text-ink-muted, leading-relaxed, font-light

/* Monospace data */
font-mono — used for metrics, telemetry values, code, captions
```

**Quy tắc Typography:**
- Headings: Playfair Display, `font-bold` hoặc `font-semibold`
- Italic `<em>` trong heading dùng accent màu espresso: `text-espresso`
- Body text: Inter light, `text-ink-muted`, line-height relaxed
- Labels/overlines: `tracking-[0.15em]` uppercase, `text-[11px]`
- Metrics: `font-mono`, bold, màu tương ứng feature

---

## 4. Layout System

### Container

```jsx
// Dùng class utility .em-container thay vì tự viết
<div className="em-container">...</div>

// = max-w-content (1320px) mx-auto px-6 md:px-10
```

### Section Padding

```
Section vertical padding:  py-20 md:py-28
Hero section:              pt-16 (nav height) + py-16 md:py-24
```

### Section Separator

```jsx
// Giữa các section — border mỏng warm-300, không dùng background color
<section className="border-t border-warm-300 bg-white">
```

### Alternating Sections (Bambu Lab pattern)

```
Odd sections:  bg-white
Even sections: bg-warm-50
```

### Grid

```
2-column feature (text + illustration): grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16
3-column workflow:                       grid-cols-1 md:grid-cols-3
4-column stats:                          grid-cols-2 md:grid-cols-4
```

---

## 5. Component Patterns

### 5.1 Section Header (Standard)

```tsx
<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
  <div>
    <div className="em-overline mb-4">Section Label</div>
    <h2 className="em-heading text-3xl md:text-4xl font-bold">
      Main Heading.
    </h2>
  </div>
  <p className="em-body text-sm max-w-[300px] md:text-right">
    Supporting description text.
  </p>
</div>
```

### 5.2 Buttons

```tsx
// Primary: dark ink background
<button className="em-btn-primary">Label <ArrowRight /></button>

// Secondary: outlined
<button className="em-btn-secondary">Label</button>

// Accent: espresso brown (sparingly)
<button className="em-btn-accent">Label</button>
```

### 5.3 Cards

```tsx
// Standard card
<div className="em-card p-6">...</div>
// = bg-white border border-warm-300 rounded-sm

// Subtle card (on white background)
<div className="bg-warm-50 border border-warm-200 rounded-sm p-4">...</div>
```

### 5.4 Espresso Accent Rule

```tsx
// Horizontal rule dưới overline để visual anchor
<div className="w-8 h-px bg-espresso mb-6" />
```

### 5.5 Numbered Steps

```tsx
// Ghost number — Playfair Display, rất lớn, màu warm-200
<div className="font-display text-5xl font-bold text-warm-200 mb-6">01</div>
```

### 5.6 Metric / KPI Display

```tsx
// Number prominent, label mono uppercase small
<div>
  <div className="font-display text-3xl font-bold text-ink">93.4°C</div>
  <div className="text-[11px] font-mono text-ink-muted uppercase tracking-label">Boiler Temp</div>
</div>
```

---

## 6. Motion & Animation

**Nguyên tắc:** Animation phải gần như vô hình — chỉ để tăng tính lịch lãm, không để gây chú ý.

| Pattern | Spec |
|---|---|
| Fade-in on scroll | `opacity 0→1, translateY 24px→0`, duration 0.7–0.8s, ease |
| Stagger delay | `delay: index × 0.12–0.15s` |
| Hover transition | `duration-200` chỉ cho `color`, `border-color`, `opacity` |
| No spring animations | Không dùng bounce hay elastic |
| No infinite animations | Không pulse loop trừ live indicator chấm nhỏ |

```tsx
// Pattern chuẩn cho scroll-reveal
useEffect(() => {
  el.style.opacity = "0";
  el.style.transform = "translateY(24px)";
  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
      obs.disconnect();
    }
  }, { threshold: 0.15 });
  obs.observe(el);
}, []);
```

---

## 7. Dashboard Consistency Rules

Để landing page và dashboard trông như 1 sản phẩm:

| Element | Landing | Dashboard |
|---|---|---|
| Background | `warm-50` | `warm-50` / `bg-background` |
| Card | `white + border warm-300` | `.bento-border` (= white + outline) |
| Active nav item | `bg-espresso-50 border-l-2 border-espresso text-espresso` | Same pattern |
| Primary button | `bg-ink text-white` | Same |
| Accent color | `espresso` (#8B5E3C) | Same |
| Font: heading | `font-display` (Playfair) | `font-display` for page titles |
| Font: body | `font-sans` (Inter) | `font-sans` |
| Font: data | `font-mono` (JetBrains) | `font-mono` |
| Dividers | `border-warm-300` | `border-outline` |

---

## 8. Responsive Breakpoints

```
Mobile:   < 768px   — stack all grids, reduce heading scale
Tablet:   768-1024px — partial grids
Desktop:  > 1024px  — full 2-col and 3-col layouts
Max:      1320px    — em-container caps content width
```

---

## 9. Iconography

- **Dùng:** Lucide React icons — simple, line-weight consistent
- **Kích thước:** `w-4 h-4` (inline), `w-5 h-5` (button), `w-6 h-6` (feature icon)
- **Màu:** `text-ink-muted` mặc định, `text-espresso` khi là accent
- **Không dùng:** Solid filled icons, emoji, icon fonts (FontAwesome)
- **SVG custom:** Chỉ dùng cho machine illustration, coffee bean logo, data charts

---

## 10. Do's & Don'ts

### ✅ Do
- Dùng Playfair Display cho tất cả section headings
- Giữ whitespace rộng — ít hơn nhiều hơn
- Dùng `em-overline` + `em-heading` pattern cho mọi section
- Border `border-warm-300` giữa sections — không dùng shadow nặng
- Tối giản nội dung — 1 heading, 1 subtext, 1 CTA per section

### ❌ Don't
- Không dùng `amber`, `yellow`, `orange` (dùng `espresso` thay thế)
- Không background màu tối giữa content sections
- Không nhiều màu accent trong 1 trang
- Không inline CSS — dùng utility classes hoặc `em-*` classes
- Không shadow nặng — chỉ `shadow-sm` hoặc `shadow-md` tối đa
- Không border-radius lớn (`rounded-2xl`, `rounded-3xl`) — dùng `rounded-sm` hoặc `rounded-lg`
- Không animation liên tục (infinite) trừ live status indicator
