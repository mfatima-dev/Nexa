# Nexa — Business Operations Platform

## PURPOSE

Nexa is a realistic business operations web application for a growing retail/e-commerce business. It allows a business owner or manager to manage orders, customers, products, inventory, and business performance from one place.

## CORE AREAS

- Overview
- Orders
- Customers
- Products
- Inventory
- Analytics
- Settings

## CORE DATA RELATIONSHIP

Customers ↔ Orders ↔ Products ↔ Inventory ↔ Analytics ↔ Overview

## IMPORTANT PRODUCT REQUIREMENT

This must feel like a real professional SaaS application, not a static student dashboard or an AI-generated template.

The application should eventually have genuinely connected interactive data. For example:
- Changing an order status should affect relevant order/activity information.
- Products should have inventory quantities.
- Orders should contain products and customers.
- Customer profiles should show order history and spending.
- Inventory should reflect product activity.
- Analytics should calculate from the underlying business data.
- Overview should summarize the same underlying data.

## TECH STACK DECISIONS

- React 19 + Vite
- JavaScript, NOT TypeScript
- React Router for page/view routing
- Plain CSS with a structured global design system, NOT Tailwind
- Recharts for analytics/data visualization
- Lucide React for icons
- React state/context initially; do NOT add Redux or another state library
- Vitest for testing
- No backend or database yet
- No authentication system yet
- No Prettier for now

## VISUAL DIRECTION

- Premium modern SaaS/business dashboard
- Deep charcoal / navy-black base
- Cool grey surfaces
- Off-white typography
- Blue as the primary accent
- Green for positive/success states
- Amber for warnings
- Red for errors/critical states
- Thin subtle borders
- Clean tables
- Professional charts
- Subtle shadows and restrained animations
- Moderate border radius
- Strong spacing and typography hierarchy

## AVOID

- Purple as a primary visual accent
- Excessive gradients
- Excessive glow
- Glassmorphism everywhere
- Huge rounded cards
- Generic AI-dashboard aesthetics
- Excessive decorative elements
- Fake functionality
- Random unrelated statistics
- Inconsistent data
- Overcomplicated architecture

## DATA

Use realistic fictional retail/e-commerce data in USD.
The initial dataset should eventually contain approximately:
- 20+ products
- 50+ customers
- 100+ orders
- Several months of transaction history

### Product examples

- Urban Backpack
- Travel Organizer
- Leather Weekender
- City Bottle
- Everyday Tote
- Passport Wallet
- Tech Organizer

### Order statuses

- Pending
- Processing
- Shipped
- Delivered
- Cancelled

## DEVELOPMENT PRINCIPLES

- Build reusable components rather than duplicating UI.
- Keep components reasonably small and understandable.
- Keep business data separate from presentation components.
- Prefer simple architecture over unnecessary abstractions.
- Make responsive behavior part of development, not an afterthought.
- Accessibility should be considered for interactive elements.
- Do not invent features outside the product direction without discussing them first.
- Do not make major visual/design decisions that conflict with the direction above.

## WORKFLOW

Build Nexa incrementally:

1. Foundation
2. App shell/navigation
3. Overview
4. Orders
5. Customers
6. Products
7. Inventory
8. Analytics
9. Settings
10. Connect shared data and interactions
11. Responsive/mobile polish
12. Testing and cleanup

Do not build the entire application in one step.
