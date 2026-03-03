---
name: apply-project-rules
description: Applies project rules from .cursor/rules/ to the codebase. Use when the user asks to apply rules, enforce conventions, refactor to match standards, or audit/fix code against project rules.
---

# Apply Project Rules to Codebase

## Overview

Read rules in `.cursor/rules/` and apply them to the relevant files. Each rule file (`.mdc`) defines conventions; this skill guides applying them systematically.

## Workflow

1. **Discover rules** — List `.cursor/rules/*.mdc` and read each rule's content and `globs` (which files it targets).
2. **Find targets** — For each rule, identify files matching its glob pattern.
3. **Apply rule** — Refactor each target file to comply with the rule.
4. **Verify** — Ensure no regressions; keep behavior unchanged.

## Project Rules Summary

### CSS Property Order (`**/*.css`)

Order properties within each rule:

1. Positioning — `position`, `top`, `right`, `bottom`, `left`, `z-index`
2. Display & Box Model — `display`, `flex`, `width`, `height`, `margin`, `padding`, `overflow`
3. Typography — `font-family`, `font-size`, `font-weight`, `line-height`, `text-align`
4. Visual — `background`, `border`, `border-radius`, `box-shadow`
5. Color — `color`, `fill`, `stroke`
6. Misc — `cursor`, `opacity`, `transition`, `animation`, `transform`

Prefer shorthand when all sides share the same value.

### Shopify Theme Assets (`**/*.liquid`)

- **Never** put `<style>` or `<script>` blocks inside Liquid files.
- **Always** use asset files:
  - CSS → `assets/name.css` + `{{ 'name.css' | asset_url | stylesheet_tag }}`
  - JS → `assets/name.js` + `{{ 'name.js' | asset_url | script_tag }}`
- File naming: kebab-case, match section/snippet name when possible.

## Application Checklist

When applying rules:

- [ ] Read full rule content from `.cursor/rules/` before editing
- [ ] Apply one rule type at a time (e.g. all CSS files, then all Liquid)
- [ ] For Liquid: extract inline styles/scripts → create `assets/*.css` and `assets/*.js`, add tags
- [ ] For CSS: reorder properties within each selector; preserve values and selectors
- [ ] Do not change behavior, logic, or visual output

## Scope

- Apply only to files matching each rule's glob.
- If the user specifies files or directories, limit changes to those.
- If no scope given, apply to the entire codebase for all rules.
