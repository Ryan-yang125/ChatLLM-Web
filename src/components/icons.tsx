import type { ReactNode, SVGProps } from "react";
import { iconoirPaths } from "./iconoir-sources";

const {
  accessibility: accessibilitySvg,
  archive: archiveSvg,
  arrowDown: arrowDownSvg,
  arrowLeft: arrowLeftSvg,
  arrowRight: arrowRightSvg,
  arrowUpRight: arrowUpRightSvg,
  book: bookSvg,
  calendar: calendarSvg,
  chatBubble: chatBubbleSvg,
  check: checkSvg,
  checkCircle: checkCircleSvg,
  circle: circleSvg,
  clipboardCheck: clipboardCheckSvg,
  cloudXmark: cloudXmarkSvg,
  code: codeSvg,
  component: componentSvg,
  compass: compassSvg,
  computer: computerSvg,
  controlSlider: controlSliderSvg,
  copy: copySvg,
  creditCard: creditCardSvg,
  drag: dragSvg,
  eye: eyeSvg,
  filter: filterSvg,
  folder: folderSvg,
  github: githubSvg,
  keyCommand: keyCommandSvg,
  language: languageSvg,
  link: linkSvg,
  mail: mailSvg,
  menu: menuSvg,
  navArrowDown: navArrowDownSvg,
  navArrowLeft: navArrowLeftSvg,
  navArrowRight: navArrowRightSvg,
  page: pageSvg,
  pause: pauseSvg,
  penTablet: penTabletSvg,
  play: playSvg,
  plus: plusSvg,
  refresh: refreshSvg,
  restart: restartSvg,
  search: searchSvg,
  send: sendSvg,
  shareIos: shareIosSvg,
  shieldCheck: shieldCheckSvg,
  shoppingBag: shoppingBagSvg,
  smartphone: smartphoneSvg,
  trash: trashSvg,
  undo: undoSvg,
  upload: uploadSvg,
  userBadgeCheck: userBadgeCheckSvg,
  userPlus: userPlusSvg,
  viewGrid: viewGridSvg,
  warningTriangle: warningTriangleSvg
} = iconoirPaths;

type IconProps = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number | string;
};

function icon(source: string) {
  const contents = source
    .replace(/^<svg\b[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");

  return function AppIcon({ size = 16, strokeWidth = 1.5, ...props }: IconProps) {
    return (
      <svg
        {...props}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-label"] ? undefined : true}
        dangerouslySetInnerHTML={{ __html: contents }}
      />
    );
  };
}

function glyph(
  paths: (strokeWidth: number | string | undefined) => ReactNode,
  displayName: string
) {
  const Glyph = ({ size = 16, strokeWidth = 1.6, ...props }: IconProps) => (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-label"] ? undefined : true}
    >
      {paths(strokeWidth)}
    </svg>
  );
  Glyph.displayName = displayName;
  return Glyph;
}

export const ComponentLibraryGlyph = glyph(() => <>
  <rect x="3.5" y="4" width="7" height="6.5" rx="1.75" />
  <rect x="13.5" y="4" width="7" height="6.5" rx="1.75" />
  <rect x="3.5" y="13.5" width="17" height="6.5" rx="1.75" />
</>, "ComponentLibraryGlyph");

export const MotionPrimitiveGlyph = glyph(() => <>
  <path d="M4 19V5M4 19H20" />
  <path d="M5 17C7.5 8.5 12 7 19 6" />
  <circle cx="5" cy="17" r="1.4" fill="currentColor" stroke="none" />
  <circle cx="19" cy="6" r="1.6" fill="currentColor" stroke="none" />
</>, "MotionPrimitiveGlyph");

export const MotionPromptGlyph = glyph(() => <>
  <rect x="4" y="4.5" width="16" height="15" rx="2.25" />
  <path d="M8 9H14.5M8 13H11.5M15.5 12V16" />
</>, "MotionPromptGlyph");

export const MotionVocabularyGlyph = glyph(() => <>
  <path d="M4 18.5H20M5 6.5H14M5 10.5H11" />
  <path d="M14.5 16.5C15.7 12 17.3 10.5 20 9" />
  <circle cx="14.5" cy="16.5" r="1.3" fill="currentColor" stroke="none" />
  <circle cx="20" cy="9" r="1.55" fill="currentColor" stroke="none" />
</>, "MotionVocabularyGlyph");

export const MotionSkillGlyph = glyph(() => <>
  <circle cx="4.5" cy="12" r="1.7" fill="currentColor" stroke="none" />
  <path d="M6.5 12H12.5C14.6 12 14.8 8.5 17 8.5H19" />
  <rect x="17.5" y="6.5" width="3.5" height="4" rx="1" />
  <path d="M12.5 15.5H19" />
</>, "MotionSkillGlyph");

export const MotionSequenceGlyph = glyph(() => <>
  <circle cx="5" cy="12" r="1.55" fill="currentColor" stroke="none" />
  <circle cx="12" cy="12" r="1.55" />
  <circle cx="19" cy="12" r="1.55" />
  <path d="M6.8 12H10.2M13.8 12H17.2" />
</>, "MotionSequenceGlyph");

export const MotionStateGlyph = glyph(() => <>
  <rect x="3.5" y="7" width="6" height="10" rx="1.5" />
  <rect x="14.5" y="7" width="6" height="10" rx="1.5" />
  <path d="M10.5 12H13.5M12 10.5L13.5 12L12 13.5" />
</>, "MotionStateGlyph");

export const MotionKeyframeGlyph = glyph(() => <>
  <path d="M4 18.5H20" />
  <path d="M5 16.5C8.3 10.4 12.2 10.4 19 6.5" />
  <circle cx="5" cy="16.5" r="1.45" fill="currentColor" stroke="none" />
  <circle cx="19" cy="6.5" r="1.7" fill="currentColor" stroke="none" />
</>, "MotionKeyframeGlyph");

export const MotionReleaseGlyph = glyph(() => <>
  <rect x="4" y="5" width="11" height="14" rx="2" />
  <path d="M10 12H20M17.5 9.5L20 12L17.5 14.5" />
  <circle cx="7.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
</>, "MotionReleaseGlyph");

export const MotionBlueprintGlyph = MotionSkillGlyph;

export const AccessibilityIcon = icon(accessibilitySvg);
export const AlertTriangle = icon(warningTriangleSvg);
export const ArchiveIcon = icon(archiveSvg);
export const ArrowDownIcon = icon(arrowDownSvg);
export const ArrowLeftIcon = icon(arrowLeftSvg);
export const ArrowRightIcon = icon(arrowRightSvg);
export const ArrowUpRightIcon = icon(arrowUpRightSvg);
export const BookOpenIcon = icon(bookSvg);
export const BracesIcon = icon(codeSvg);
export const CalendarClockIcon = icon(calendarSvg);
export const CheckIcon = icon(checkSvg);
export const CheckCircle2Icon = icon(checkCircleSvg);
export const ChevronDownIcon = icon(navArrowDownSvg);
export const ChevronLeftIcon = icon(navArrowLeftSvg);
export const ChevronRightIcon = icon(navArrowRightSvg);
export const CircleIcon = icon(circleSvg);
export const ClipboardCheckIcon = icon(clipboardCheckSvg);
export const CloudOffIcon = icon(cloudXmarkSvg);
export const Code2Icon = icon(codeSvg);
export const CommandIcon = icon(keyCommandSvg);
export const CompassIcon = icon(compassSvg);
export const CopyIcon = icon(copySvg);
export const CreditCardIcon = icon(creditCardSvg);
export const EyeIcon = icon(eyeSvg);
export const FileTextIcon = icon(pageSvg);
export const FilterIcon = icon(filterSvg);
export const FolderIcon = icon(folderSvg);
export const GithubIcon = icon(githubSvg);
export const GripVerticalIcon = icon(dragSvg);
export const LanguagesIcon = icon(languageSvg);
export const Layers3Icon = icon(componentSvg);
export const LayoutGridIcon = icon(viewGridSvg);
export const LinkIcon = icon(linkSvg);
export const MailIcon = icon(mailSvg);
export const MenuIcon = icon(menuSvg);
export const MessageCircleIcon = icon(chatBubbleSvg);
export const MonitorIcon = icon(computerSvg);
export const PauseIcon = icon(pauseSvg);
export const PlayIcon = icon(playSvg);
export const PlusIcon = icon(plusSvg);
export const RefreshCwIcon = icon(refreshSvg);
export const RotateCcwIcon = icon(restartSvg);
export const SearchIcon = icon(searchSvg);
export const SendIcon = icon(sendSvg);
export const Share2Icon = icon(shareIosSvg);
export const ShieldCheckIcon = icon(shieldCheckSvg);
export const ShoppingBagIcon = icon(shoppingBagSvg);
export const SlidersHorizontalIcon = icon(controlSliderSvg);
export const SmartphoneIcon = icon(smartphoneSvg);
export const TabletIcon = icon(penTabletSvg);
export const Trash2Icon = icon(trashSvg);
export const Undo2Icon = icon(undoSvg);
export const UploadIcon = icon(uploadSvg);
export const UserPlusIcon = icon(userPlusSvg);
export const UserRoundCheckIcon = icon(userBadgeCheckSvg);
export const ComponentIcon = icon(componentSvg);

export {
  AccessibilityIcon as Accessibility,
  ArchiveIcon as Archive,
  ArrowDownIcon as ArrowDown,
  ArrowLeftIcon as ArrowLeft,
  ArrowRightIcon as ArrowRight,
  ArrowUpRightIcon as ArrowUpRight,
  BookOpenIcon as BookOpen,
  BracesIcon as Braces,
  CalendarClockIcon as CalendarClock,
  CheckIcon as Check,
  CheckCircle2Icon as CheckCircle2,
  ChevronDownIcon as ChevronDown,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  CircleIcon as Circle,
  MotionKeyframeGlyph as CircleDotDashed,
  ClipboardCheckIcon as ClipboardCheck,
  CloudOffIcon as CloudOff,
  Code2Icon as Code2,
  CommandIcon as Command,
  CompassIcon as Compass,
  CopyIcon as Copy,
  CreditCardIcon as CreditCard,
  EyeIcon as Eye,
  FileTextIcon as FileText,
  FilterIcon as Filter,
  FolderIcon as Folder,
  GithubIcon as Github,
  GripVerticalIcon as GripVertical,
  LanguagesIcon as Languages,
  Layers3Icon as Layers3,
  LayoutGridIcon as LayoutGrid,
  LinkIcon as Link,
  MailIcon as Mail,
  MenuIcon as Menu,
  MessageCircleIcon as MessageCircle,
  MonitorIcon as Monitor,
  PauseIcon as Pause,
  PlayIcon as Play,
  PlusIcon as Plus,
  RefreshCwIcon as RefreshCw,
  RotateCcwIcon as RotateCcw,
  SearchIcon as Search,
  SendIcon as Send,
  Share2Icon as Share2,
  ShieldCheckIcon as ShieldCheck,
  ShoppingBagIcon as ShoppingBag,
  SlidersHorizontalIcon as SlidersHorizontal,
  SmartphoneIcon as Smartphone,
  TabletIcon as Tablet,
  Trash2Icon as Trash2,
  Undo2Icon as Undo2,
  UploadIcon as Upload,
  UserPlusIcon as UserPlus,
  UserRoundCheckIcon as UserRoundCheck
};
