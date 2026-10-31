/* Edify teacher UI kit — import everything from "@/components/ui".
   Design tokens live in ./theme.css (imported once in app/teacher/layout.tsx);
   the switchboard driving them is /design.teacher.config.ts. */

export { cn } from "./cn";
export { SIDE_STYLES, resolveSideStyle } from "./shellStyles";
export type { SideStyle, SideVariant, Indicator } from "./shellStyles";
export { TeacherThemeProvider, useTeacherTheme } from "./TeacherThemeProvider";
export {
  TEACHER_DESIGN, MOTION_ON, MOTION_EXPRESSIVE,
  springTransition, fadeUp, popIn, pageTransition, staggerContainer, staggerItem,
} from "./config";
export { Button, IconButton } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize, IconButtonProps } from "./Button";
export { Card, CardHeader } from "./Card";
export type { CardProps, CardVariant, CardHeaderProps } from "./Card";
export { Chip, StatusChip } from "./Chip";
export type { ChipProps, StatusChipProps, StatusTone } from "./Chip";
export { TextField, TextArea, Select, SearchBar } from "./TextField";
export type { TextFieldProps, TextAreaProps, SelectProps, SearchBarProps } from "./TextField";
export { Switch, Checkbox, Radio } from "./Selection";
export { ProgressBar, Spinner, Skeleton, Loader } from "./Progress";
export type { ProgressBarProps, LoaderProps } from "./Progress";
export { Dialog, ConfirmDialog } from "./Dialog";
export type { DialogProps, ConfirmDialogProps } from "./Dialog";
export { Banner } from "./Banner";
export type { BannerProps, BannerTone } from "./Banner";
export { uiToast } from "./toast";
export { Tabs } from "./Tabs";
export type { TabItem, TabsProps } from "./Tabs";
export { Table, Th, TRow, Td, Pagination } from "./Table";
export type { PaginationProps } from "./Table";
export { ListItem, Avatar, Badge } from "./List";
export type { ListItemProps, AvatarProps, AvatarTone, BadgeProps } from "./List";
export { Menu } from "./Menu";
export type { MenuProps, MenuItemDef } from "./Menu";
export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";
export { StatTile } from "./StatTile";
export type { StatTileProps } from "./StatTile";
export { PageHeader } from "./PageHeader";
export { ThemeWaveToggle } from "./ThemeWaveToggle";
export { PillGroup } from "./PillGroup";
export type { PillGroupProps, PillGroupOption } from "./PillGroup";
export type { ThemeWaveToggleProps } from "./ThemeWaveToggle";
export type { PageHeaderProps } from "./PageHeader";
