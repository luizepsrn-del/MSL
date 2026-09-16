/**
 * My System Life — design system.
 *
 * This barrel is the ONLY supported import surface. Application code imports
 * from `design-system`, never from `design-system/components/...` directly —
 * the adherence rules in adherence.rules.json enforce that.
 *
 *   import { Button, StatCard, Badge } from '../../design-system';
 *
 * The stylesheet is imported once, at the app root:
 *
 *   import '../design-system/styles.css';
 *
 * Layers:
 *   components/  the 34 primitives
 *   patterns/    the assembled screens and shells they compose into
 *
 * See DESIGN.md for the visual contract and design-system/README.md for the map.
 */
export * from './components';
export * from './patterns';
