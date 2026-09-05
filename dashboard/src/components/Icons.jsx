// ── Custom SVG Icon Components ──────────────────────────────────────────────
// Unified icon library — no emojis, no external libraries — pure hand-crafted SVGs
// Each icon accepts `size` (px) and `color` (CSS color) props

import { memo } from 'react'

// ── Navigation & Layout ─────────────────────────────────────────────────────
export const IconDashboard = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="3" y="3" width="7" height="9" rx="1.5" />
		<rect x="14" y="3" width="7" height="5" rx="1.5" />
		<rect x="14" y="12" width="7" height="9" rx="1.5" />
		<rect x="3" y="16" width="7" height="5" rx="1.5" />
	</svg>
))

export const IconHome = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
		<polyline points="9 22 9 12 15 12 15 22" />
	</svg>
))

export const IconMenu = memo(({ size = 22, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<line x1="3" y1="6" x2="21" y2="6" />
		<line x1="3" y1="12" x2="21" y2="12" />
		<line x1="3" y1="18" x2="21" y2="18" />
	</svg>
))

export const IconX = memo(({ size = 16, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
		<line x1="18" y1="6" x2="6" y2="18" />
		<line x1="6" y1="6" x2="18" y2="18" />
	</svg>
))

export const IconChevronDown = memo(({ size = 14, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="6 9 12 15 18 9" />
	</svg>
))

export const IconChevronRight = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="9 18 15 12 9 6" />
	</svg>
))

// ── Bot & Communication ─────────────────────────────────────────────────────
export const BotIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<rect x="6" y="8" width="12" height="10" rx="2" />
		<path d="M6 11h12" />
		<circle cx="9" cy="14" r="0.8" fill={color} stroke="none" />
		<circle cx="15" cy="14" r="0.8" fill={color} stroke="none" />
		<path d="M9 5l-2 2M15 5l2 2" />
		<path d="M12 5V3" />
	</svg>
))

export const MessageIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
		<path d="M8 9h8M8 13h5" />
	</svg>
))

export const IconMessage = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
	</svg>
))

export const IconSend = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<line x1="22" y1="2" x2="11" y2="13" />
		<polygon points="22 2 15 22 11 13 2 9 22 2" />
	</svg>
))

export const IconPhone = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
		<line x1="12" y1="18" x2="12.01" y2="18" />
	</svg>
))

export const IconWhatsApp = memo(({ size = 22, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
		<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
	</svg>
))

// ── Users & Groups ──────────────────────────────────────────────────────────
export const IconGroups = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="9" cy="7" r="3.5" />
		<path d="M2 21v-2a6 6 0 0 1 6-6h.5a3.5 3.5 0 0 1 7 0" />
		<circle cx="17.5" cy="8.5" r="2.5" />
		<path d="M22 21v-1.5a3.5 3.5 0 0 0-3.5-3.5h-.5" />
	</svg>
))

export const GroupIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
	</svg>
))

export const IconMembers = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
	</svg>
))

export const UsersIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M22 21v-2a4 4 0 00-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
	</svg>
))

export const IconUsers = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
	</svg>
))

// ── Commands & Features ──────────────────────────────────────────────────────
export const IconCommands = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="4 17 10 11 4 5" />
		<line x1="12" y1="19" x2="20" y2="19" />
		<circle cx="17" cy="7" r="1.5" fill={color} stroke="none" />
	</svg>
))

export const CommandIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="4 17 10 11 4 5" />
		<line x1="12" y1="19" x2="20" y2="19" />
	</svg>
))

// ── Analytics & Data ────────────────────────────────────────────────────────
export const IconAnalytics = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M3 3v18h18" />
		<path d="m19 9-5 5-4-4-3 3" />
	</svg>
))

export const IconBarChart = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<line x1="12" y1="20" x2="12" y2="10" />
		<line x1="18" y1="20" x2="18" y2="4" />
		<line x1="6" y1="20" x2="6" y2="16" />
	</svg>
))

export const IconTrendingUp = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
		<polyline points="17 6 23 6 23 12" />
	</svg>
))

export const TrendingUpIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
		<polyline points="17 6 23 6 23 12" />
	</svg>
))

export const TrendingDownIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
		<polyline points="17 18 23 18 23 12" />
	</svg>
))

export const DatabaseIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<ellipse cx="12" cy="5" rx="9" ry="3" />
		<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
		<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
	</svg>
))

// ── Broadcast & Alerts ───────────────────────────────────────────────────────
export const IconBroadcast = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
		<path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
		<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
		<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
	</svg>
))

export const BellIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
		<path d="M13.73 21a2 2 0 01-3.46 0" />
	</svg>
))

export const IconAlert = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
		<line x1="12" y1="9" x2="12" y2="13" />
		<line x1="12" y1="17" x2="12.01" y2="17" />
	</svg>
))

// ── Health & Monitoring ──────────────────────────────────────────────────────
export const IconHealth = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
		<circle cx="12" cy="12" r="10" />
		<circle cx="12" cy="12" r="3" fill={color} stroke="none" opacity="0.3" />
	</svg>
))

export const IconActivity = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
	</svg>
))

export const ActivityIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
	</svg>
))

export const IconWifi = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M5 12.55a11 11 0 0 1 14.08 0" />
		<path d="M1.42 9a16 16 0 0 1 21.16 0" />
		<path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
		<line x1="12" y1="20" x2="12.01" y2="20" />
	</svg>
))

export const IconCpu = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
		<rect x="9" y="9" width="6" height="6" />
		<line x1="9" y1="1" x2="9" y2="4" />
		<line x1="15" y1="1" x2="15" y2="4" />
		<line x1="9" y1="20" x2="9" y2="23" />
		<line x1="15" y1="20" x2="15" y2="23" />
		<line x1="20" y1="9" x2="23" y2="9" />
		<line x1="20" y1="14" x2="23" y2="14" />
		<line x1="1" y1="9" x2="4" y2="9" />
		<line x1="1" y1="14" x2="4" y2="14" />
	</svg>
))

export const IconServer = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
		<rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
		<line x1="6" y1="6" x2="6.01" y2="6" />
		<line x1="6" y1="18" x2="6.01" y2="18" />
	</svg>
))

export const IconClock = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
	</svg>
))

export const ClockIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
	</svg>
))

export const IconWrench = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
	</svg>
))

// ── Logs & Files ────────────────────────────────────────────────────────────
export const LogsIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
		<polyline points="14 2 14 8 20 8" />
		<line x1="16" y1="13" x2="8" y2="13" />
		<line x1="16" y1="17" x2="8" y2="17" />
		<polyline points="10 9 9 9 8 9" />
	</svg>
))

export const IconFileText = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
		<polyline points="14 2 14 8 20 8" />
		<line x1="16" y1="13" x2="8" y2="13" />
		<line x1="16" y1="17" x2="8" y2="17" />
	</svg>
))

export const IconSearch = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="11" cy="11" r="8" />
		<line x1="21" y1="21" x2="16.65" y2="16.65" />
	</svg>
))

export const SearchIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="11" cy="11" r="8" />
		<line x1="21" y1="21" x2="16.65" y2="16.65" />
	</svg>
))

export const IconCopy = memo(({ size = 16, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
		<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
	</svg>
))

export const IconTrash = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="3 6 5 6 21 6" />
		<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
		<line x1="10" y1="11" x2="10" y2="17" />
		<line x1="14" y1="11" x2="14" y2="17" />
	</svg>
))

// ── Security & Auth ──────────────────────────────────────────────────────────
export const IconLogout = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
		<polyline points="16 17 21 12 16 7" />
		<line x1="21" y1="12" x2="9" y2="12" />
	</svg>
))

export const IconLock = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
		<path d="M7 11V7a5 5 0 0 1 10 0v4" />
		<circle cx="12" cy="16" r="1" fill={color} stroke="none" />
	</svg>
))

export const IconUnlock = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
		<path d="M7 11V7a5 5 0 0 1 9.9-1" />
	</svg>
))

export const IconShield = memo(({ size = 22, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
		<polyline points="9 12 11 14 15 10" />
	</svg>
))

export const ShieldIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
		<polyline points="9 12 11 14 15 10" />
	</svg>
))

export const IconEye = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
		<circle cx="12" cy="12" r="3" />
	</svg>
))

export const IconEyeOff = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
		<line x1="1" y1="1" x2="23" y2="23" />
	</svg>
))

// ── Power & System ──────────────────────────────────────────────────────────
export const IconPower = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M18.36 6.64a9 9 0 11-12.73 0" />
		<line x1="12" y1="2" x2="12" y2="12" />
	</svg>
))

export const PowerIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M18.36 6.64a9 9 0 11-12.73 0" />
		<line x1="12" y1="2" x2="12" y2="12" />
	</svg>
))

export const IconRefresh = memo(({ size = 16, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="23 4 23 10 17 10" />
		<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
	</svg>
))

export const RefreshIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="23 4 23 10 17 10" />
		<path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
	</svg>
))

export const IconSettings = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="3" />
		<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-.58 1.82V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-.58-1.82 1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.82-.58H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .58-1.82V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 .58 1.82 1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.82.58H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
	</svg>
))

export const SettingsIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="3" />
		<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-.58 1.82V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-.58-1.82 1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.82-.58H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .58-1.82V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 .58 1.82 1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.82.58H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
	</svg>
))

export const PluginsIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<rect x="2" y="6" width="8" height="8" rx="1" />
		<rect x="14" y="6" width="8" height="8" rx="1" />
		<path d="M10 10h4M10 13h4M6 19l2-2M14 19l-2-2" />
		<circle cx="6" cy="10" r="1" fill={color} stroke="none" />
		<circle cx="18" cy="10" r="1" fill={color} stroke="none" />
	</svg>
))

export const IconPlugins = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="2" y="6" width="8" height="8" rx="1" />
		<rect x="14" y="6" width="8" height="8" rx="1" />
		<path d="M10 10h4M10 13h4M6 19l2-2M14 19l-2-2" />
		<circle cx="6" cy="10" r="1" fill={color} stroke="none" />
		<circle cx="18" cy="10" r="1" fill={color} stroke="none" />
	</svg>
))

// ── Media & Fun ──────────────────────────────────────────────────────────────
export const IconGlobe = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="10" />
		<line x1="2" y1="12" x2="22" y2="12" />
		<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
	</svg>
))

export const GlobeIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="10" />
		<line x1="2" y1="12" x2="22" y2="12" />
		<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
	</svg>
))

export const IconZap = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
	</svg>
))

export const ZapIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
	</svg>
))

export const IconPalette = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="10" />
		<circle cx="12" cy="8" r="1.8" fill={color} stroke="none" />
		<circle cx="8" cy="13" r="1.8" fill={color} stroke="none" />
		<circle cx="16" cy="13" r="1.8" fill={color} stroke="none" />
		<circle cx="12" cy="18" r="1.8" fill={color} stroke="none" />
	</svg>
))

export const IconMusic = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M9 18V5l12-2v13" />
		<circle cx="6" cy="18" r="3" />
		<circle cx="18" cy="16" r="3" />
	</svg>
))

export const IconCurrency = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="10" />
		<path d="M12 6v12" />
		<path d="M8 10a4 4 0 0 1 8 0" />
		<path d="M8 14a4 4 0 0 1 8 0" />
	</svg>
))

export const IconGamepad = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<line x1="6" y1="12" x2="10" y2="12" />
		<line x1="8" y1="10" x2="8" y2="14" />
		<line x1="15" y1="13" x2="15.01" y2="13" />
		<line x1="18" y1="11" x2="18.01" y2="11" />
		<rect x="2" y="6" width="20" height="12" rx="2" />
	</svg>
))

export const IconSmile = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="10" />
		<path d="M8 14s1.5 2 4 2 4-2 4-2" />
		<line x1="9" y1="9" x2="9.01" y2="9" />
		<line x1="15" y1="9" x2="15.01" y2="9" />
	</svg>
))

// ── Moderation & Actions ─────────────────────────────────────────────────────
export const IconLink = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
	</svg>
))

export const IconHand = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<path d="M18 11V6a2 2 0 0 0-4 0v1" />
		<path d="M14 10V5a2 2 0 0 0-4 0v5" />
		<path d="M10 10.5V7a2 2 0 0 0-4 0v8" />
		<path d="M18 11a2 2 0 1 1 4 0v5a8 8 0 0 1-16 0v-1.5a2 2 0 0 1 4 0V11" />
	</svg>
))

export const IconCheck = memo(({ size = 16, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="20 6 9 17 4 12" />
	</svg>
))

export const IconQrCode = memo(({ size = 18, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="3" y="3" width="7" height="7" rx="1.5" />
		<rect x="14" y="3" width="7" height="7" rx="1.5" />
		<rect x="3" y="14" width="7" height="7" rx="1.5" />
		<rect x="14" y="14" width="3" height="3" />
		<rect x="18" y="14" width="3" height="3" />
		<rect x="14" y="18" width="3" height="3" />
		<rect x="18" y="18" width="3" height="3" />
	</svg>
))

export const MoonIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
	</svg>
))

// ── Errors & States ──────────────────────────────────────────────────────────
export const ErrorIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="12" r="10" />
		<line x1="12" y1="8" x2="12" y2="12" />
		<line x1="12" y1="16" x2="12.01" y2="16" />
	</svg>
))

export const WarningIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
		<line x1="12" y1="9" x2="12" y2="13" />
		<line x1="12" y1="17" x2="12.01" y2="17" />
	</svg>
))

// ── Unified export map ───────────────────────────────────────────────────────
export const Icons = {
	// Navigation & Layout
	IconDashboard, IconHome, IconMenu, IconX, IconChevronDown, IconChevronRight,
	// Bot & Communication
	BotIcon, MessageIcon, IconMessage, IconSend, IconPhone, IconWhatsApp,
	// Users & Groups
	IconGroups, GroupIcon, IconMembers, UsersIcon, IconUsers,
	// Commands & Features
	IconCommands, CommandIcon,
	// Analytics & Data
	IconAnalytics, IconBarChart, IconTrendingUp, TrendingUpIcon, TrendingDownIcon, DatabaseIcon,
	// Broadcast & Alerts
	IconBroadcast, BellIcon, IconAlert,
	// Health & Monitoring
	IconHealth, IconActivity, ActivityIcon, IconWifi, IconCpu, IconServer, IconClock, ClockIcon, IconWrench,
	// Logs & Files
	LogsIcon, IconFileText, IconSearch, SearchIcon, IconCopy, IconTrash,
	// Security & Auth
	IconLogout, IconLock, IconUnlock, IconShield, ShieldIcon, IconEye, IconEyeOff,
	// Power & System
	IconPower, PowerIcon, IconRefresh, RefreshIcon, IconSettings, SettingsIcon, IconPlugins, PluginsIcon, IconQrCode,
	// Media & Fun
	IconGlobe, GlobeIcon, IconZap, ZapIcon, IconPalette, IconMusic, IconCurrency, IconGamepad, IconSmile,
	// Moderation & Actions
	IconLink, IconHand, IconCheck, MoonIcon,
	// Errors & States
	ErrorIcon, WarningIcon,
}

export default Icons
