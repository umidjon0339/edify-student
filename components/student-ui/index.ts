/**
 * STUDENT UI KIT — the single import for every app/(student)/** component.
 *
 *   import { Button, Card, XpProgress } from '@/components/student-ui';
 *
 * Every component defaults to the variant chosen in design.config.ts, so
 * changing one word there restyles the whole app. Pass an explicit prop to
 * override a single instance.
 *
 * Rules for pages:
 *   1. Never hard-code a color, radius or shadow — use token utilities
 *      (bg-primary, text-on-surface-variant, rounded-m3-lg, shadow-elev-1).
 *   2. Never import components/ui/* (that is the teacher kit) into a student page.
 *   3. theme.css is imported once by the student layout — never by a page.
 *
 * Guide: docs/STUDENT_UI.md
 */

export { cn } from './cn';
export { DESIGN, themeAttributes, MOTION_ON, springTransition, fadeUp } from './config';
export type { DesignConfig } from './config';
export { StudentThemeProvider, useStudentTheme } from './StudentThemeProvider';
export { ThemeWaveToggle } from './ThemeWaveToggle';
export { useRipple } from './useRipple';

export { Button, IconButton, Fab, SegmentedControl } from './Button';
export type { ButtonProps, IconButtonProps, FabProps, SegmentedControlProps } from './Button';

export { Card, CardHeader, Tile } from './Card';
export type { CardProps, CardHeaderProps, TileProps } from './Card';

export { ListGroup, ListRow, Avatar } from './List';
export type { ListGroupProps, ListRowProps, AvatarProps } from './List';

export { Chip, FilterChip } from './Chip';
export type { ChipProps, FilterChipProps, Status } from './Chip';

export { TextField, SearchBar, TextArea, Select } from './TextField';
export type { TextFieldProps, SearchBarProps, TextAreaProps, SelectProps } from './TextField';

export { Switch, Checkbox, Radio, Slider, SettingRow } from './Selection';
export type { SwitchProps, CheckboxProps, RadioProps, SliderProps, SettingRowProps } from './Selection';

export { ProgressBar, Spinner, Skeleton, LoadingState, WavyProgress } from './Progress';
export type { ProgressBarProps, SpinnerProps, SkeletonProps, LoadingStateProps } from './Progress';

export { Dialog, ConfirmDialog } from './Dialog';
export type { DialogProps, ConfirmDialogProps } from './Dialog';

export { Banner } from './Banner';
export type { BannerProps } from './Banner';

export { sToast } from './toast';

export { PageHeader, Page, Stack } from './PageHeader';
export type { PageHeaderProps, PageProps } from './PageHeader';

export { EmptyState, ErrorState } from './EmptyState';
export type { EmptyStateProps, ErrorStateProps } from './EmptyState';

export { StatTile, StatBand, Sparkline } from './StatTile';
export type { StatTileProps, StatBandProps } from './StatTile';

export { Tabs } from './Tabs';
export type { TabsProps, TabItem } from './Tabs';

export { Shell, MobileDrawer } from './Shell';
export type { ShellProps, NavItem, NavGroup } from './Shell';
export { SIDE_STYLES, resolveSideStyle } from './shellStyles';
export type { SideStyle, SideVariant, IndicatorKind } from './shellStyles';

export {
  XpProgress,
  StreakDisplay,
  Podium,
  RankRow,
  QuestList,
  BadgeGrid,
  Celebration,
  PopOnChange,
} from './Gamification';
export type {
  XpProgressProps,
  StreakDisplayProps,
  RankEntry,
  PodiumProps,
  RankRowProps,
  Quest,
  BadgeItem,
} from './Gamification';
export { Flag } from './Flag';
export type { FlagCode } from './Flag';
