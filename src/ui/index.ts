/**
 * El kit, todo desde un solo sitio: `import { Button, useTheme } from "@/ui"`.
 */

// Tokens y tema
export { darkTheme, lightTheme, neutral, themes } from "./tokens";
export type { ColorTokens, ShadowToken, Tema, TypeStyle, TypographyTokens } from "./tokens";
export { crearTema, deepMerge } from "./theme/create-theme";
export type { DeepPartial } from "./theme/create-theme";
export { ThemeProvider, useStyles, useTheme } from "./theme/theme-provider";
export { contrastRatio, luminance, MIN_TEXT_CONTRAST } from "./theme/contrast";
export { fontFamily, textStyle } from "./theme/text-style";
export { installFocusVisible } from "./theme/focus-visible";

// Estados de lo que se toca
export { hitSlopFor, pickByInteraction, resolveInteraction, touchOutset } from "./pressable-state";
export type { EstadoPresionable, ForcedInteraction, Interaction, InteractionFlags } from "./pressable-state";

// Componentes
export { Button } from "./components/button";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./components/button";
export { ConfirmButton } from "./components/confirm-button";
export type { ConfirmButtonProps } from "./components/confirm-button";
export { FieldLabel, TextField } from "./components/text-field";
export type { TextFieldProps, TextFieldTone } from "./components/text-field";
export { Select } from "./components/select";
export type { SelectOption, SelectProps, SelectTexts } from "./components/select";
export { filterOptions, isFiltering, moveActive, normalize } from "./components/select-logic";
export { Chip } from "./components/chip";
export type { ChipProps, ChipTone } from "./components/chip";
export {
  Badge,
  Body,
  Card,
  DialogTitle,
  KeyValueRow,
  ScreenTitle,
  SectionLabel,
  SectionTitle,
  StatusDot,
  Surface,
} from "./components/surfaces";
export type { StatusTone, SurfaceVariant } from "./components/surfaces";
export { Dialog, DialogPanel, ModalScrim } from "./components/dialog";
export type { DialogPanelProps } from "./components/dialog";
export {
  DataTable,
  ROWS_PER_PAGE,
  TableEmpty,
  TableHead,
  TableMore,
  TableRow,
  Td,
  TdView,
  Th,
  usePagedRows,
} from "./components/data-table";
export type { TableRowProps } from "./components/data-table";
export { SideMenu } from "./components/side-menu";
export { BottomNav } from "./components/bottom-nav";
export type { BottomNavProps } from "./components/bottom-nav";
export { ActionMenu } from "./components/action-menu";
export type { ActionMenuItem, ActionMenuProps } from "./components/action-menu";
export { menuPosition, orderActions } from "./components/action-menu-logic";
export type { SideMenuItem, SideMenuProps } from "./components/side-menu";
export { AppShell, Menu, MenuBackdrop, MenuItem, MenuNote } from "./components/app-shell";
export type { AppShellProps } from "./components/app-shell";
export { Calendar } from "./components/calendar";
export type { CalendarProps, CalendarTexts } from "./components/calendar";
export { addMonths, daysOfMonth, isoDate, orderRange, todayIso } from "./components/calendar-logic";
export { Meter } from "./components/meter";
export type { MeterProps } from "./components/meter";
export { CellWithBar } from "./components/cell-with-bar";
export { LevelBar } from "./components/level-bar";
export type { LevelBarProps, LevelBarTexts } from "./components/level-bar";
export { levelPositions, levelZone } from "./components/level-logic";
export type { LevelPositions, LevelZone } from "./components/level-logic";
export type { CellWithBarProps } from "./components/cell-with-bar";
export { FitNumber } from "./components/fit-number";
export type { FitNumberProps } from "./components/fit-number";
export { barWidth, fitFontSize } from "./components/number-logic";
export { ChoiceChips, Form, FormCell, FormFooter, FormGroup, FormRow } from "./components/form";
export { Checkbox } from "./components/checkbox";
export type { CheckboxProps } from "./components/checkbox";
export { Avatar } from "./components/avatar";
export type { AvatarProps, AvatarSize } from "./components/avatar";
export { initials } from "./components/avatar-logic";
export { Board, BoardCard, BoardColumn } from "./components/board";
export { TouchArea } from "./components/touch-area";
export { Stepper } from "./components/stepper";
export type { StepperProps, StepperTexts } from "./components/stepper";
export { canStep, stepValue } from "./components/stepper-logic";
export { ScheduleGrid } from "./components/schedule-grid";
export type { ScheduleColumn, ScheduleGridProps, ScheduleGridTexts, ScheduleItem } from "./components/schedule-grid";
export { buildSlots, hourMarks, layoutLanes, minuteLabel, minuteToY, overlaps } from "./components/schedule-logic";
export type { Lane, ScheduleRange, Slot, SlotState } from "./components/schedule-logic";
export { Tabs } from "./components/tabs";
export type { TabItem, TabsProps } from "./components/tabs";
export { StageTrack } from "./components/stage-track";
export type { Stage, StageTrackProps } from "./components/stage-track";
export { StepCards } from "./components/step-cards";
export type { StepCardItem, StepCardsProps } from "./components/step-cards";
export { firstOpenStep, STEP_CARD_TEXTS, stepAccessibilityLabel, stepSign } from "./components/step-cards-logic";
export type { StepCardStatus, StepCardTexts } from "./components/step-cards-logic";
export { Timeline } from "./components/timeline";
export type { TimelineEvent, TimelineTone } from "./components/timeline";
export { EmptyState } from "./components/empty-state";
export { nextSort, sortBy, stageProgress, stageStatuses } from "./components/stage-logic";
export type { SortDirection, StageStatus } from "./components/stage-logic";
export type { BoardCardProps, BoardColumnProps } from "./components/board";

// Gráficas
export * from "./charts";
