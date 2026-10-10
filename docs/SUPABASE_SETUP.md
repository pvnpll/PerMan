# Supabase Setup & Migration Guide

## Supabase Project: `random` (`shfkfqdfahnxodewxupi`)

PerMang is deployed into the existing Supabase project named **`random`**.

### Strict Isolation Rules
- **Prefix Isolation**: Every single PerMang table starts with `pm_`.
- **Protected Sibling Tables**: Tables belonging to sibling applications (`cf_*` Calflow, `ir_*` InstaReels, and legacy tables) are untouched.
- **Row Level Security**: Every table has RLS enabled with `auth.uid()` policies.

---

## 1. Migration Execution

The complete database schema is version-controlled in:
[`supabase/migrations/001_permang_initial_schema.sql`](file:///Users/pavan/Build/permang/supabase/migrations/001_permang_initial_schema.sql)

### How to apply:
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select the project **`random`** (`shfkfqdfahnxodewxupi`).
3. Click **SQL Editor** from the left navigation.
4. Click **New Query**.
5. Paste the entire content of [`supabase/migrations/001_permang_initial_schema.sql`](file:///Users/pavan/Build/permang/supabase/migrations/001_permang_initial_schema.sql).
6. Click **Run**.

---

## 2. Seed Data Included

The migration automatically creates default taxonomy when a user signs up or initializes:
1. **Development & Projects**: Calflow, Rimev, Klay, Personal Website & Domain, Instagram/Reels Automation, AI Experiments, Other Projects.
2. **Personal & Life Admin**: Daily Errands, Family & Friends, Calls & Messages, Appointments, Documents & Renewals, Home Maintenance, Travel Administration, Important Commitments.
3. **Finances**: Expenses to Record, Bills & Payments, Subscriptions, Investments & IPOs, Banking & UPI, Budget & Savings, Taxes & Financial Documents.
4. **Shopping & Purchases**: Amazon, Flipkart, Offline Stores, Groceries, Electronics, Clothing & Accessories, Fitness & Nutrition, Wishlist, Price Tracking, Returns & Refunds, Warranties.
5. **Learning & Career**: Java, Spring Boot & Microservices, LeetCode & DSA, SAP Hybris, AI & LLM Research, Courses & Tutorials, Interview Preparation, Career Applications.
6. **Health & Fitness**: Gym & Workouts, Nutrition & Meal Planning, Supplements, Medical Appointments, Health Follow-ups, Dance & Physical Activities.
7. **Personal Practice & Routine**: Daily Practice, Reading, Journaling & Reflection, Recurring Routines, Personal Commitments.
8. **Content & Creativity**: Instagram Content, Reel Ideas & Scripts, AI Image & Video Experiments, Blog Ideas & Research, Creative Experiments.
9. **Travel & Experiences**: Trip Planning, Bookings & Reservations, Packing Lists, Treks & Outdoor Activities, Places to Visit.
10. **Ideas & Someday**: App Ideas, Business Ideas, Research Ideas, Future Purchases, Experiments to Try.

---

## 3. Verify Database Status

Run the verification script from the repository root:
```bash
npx tsx scripts/db-check.ts
```
The script will query the Supabase REST API schema cache and report whether all 12 `pm_` tables are present and verified.
