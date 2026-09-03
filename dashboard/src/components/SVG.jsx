import { memo } from 'react'

// ── SVG Icon Components ────────────────────────────────────────────────────
// All icons use 24x24 viewBox, 2px stroke, clean geometric style
// Accept `size` (px) and `color` (CSS color) props

const baseStyle = (size = 24, color = 'currentColor') => ({
	width: size,
	height: size,
	viewBox: '0 0 24 24',
	fill: 'none',
	stroke: color,
	strokeWidth: 2,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
})

export const BotIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<rect x="6" y="8" width="12" height="10" rx="2" />
		<path d="M6 11h12" />
		<circle cx="9" cy="14" r="0.8" fill={color} stroke="none" />
		<circle cx="15" cy="14" r="0.8" fill={color} stroke="none" />
		<path d="M9 5l-2 2M15 5l2 2" />
		<path d="M12 5V3" />
	</svg>
))

export const MessageIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
		<path d="M8 9h8M8 13h5" />
	</svg>
))

export const GroupIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
	</svg>
))

export const UsersIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M22 21v-2a4 4 0 00-3-3.87" />
		<path d="M16 3.13a4 4 0 010 7.75" />
	</svg>
))

export const ActivityIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
	</svg>
))

export const ErrorIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<circle cx="12" cy="12" r="10" />
		<line x1="12" y1="8" x2="12" y2="12" />
		<line x1="12" y1="16" x2="12.01" y2="16" />
	</svg>
))

export const SettingsIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<circle cx="12" cy="12" r="3" />
		<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82.33 1.65 1.65 0 00-.58 1.82V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-.58-1.82 1.65 1.65 0 00-1.82-.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.82-.58H3a2 2 0 010-4h.09a1.65 1.65 0 001.82-.33 1.65 1.65 0 00.58-1.82V3a2 2 0 014 0v.09a1.65 1.65 0 00.58 1.82 1.65 1.65 0 001.82.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.82.58H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.82.33z" />
	</svg>
))

export const PluginsIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<rect x="2" y="6" width="8" height="8" rx="1" />
		<rect x="14" y="6" width="8" height="8" rx="1" />
		<path d="M10 10h4M10 13h4M6 19l2-2M14 19l-2-2" />
		<circle cx="6" cy="10" r="1" fill={color} stroke="none" />
		<circle cx="18" cy="10" r="1" fill={color} stroke="none" />
	</svg>
))

export const LogsIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
		<polyline points="14 2 14 8 20 8" />
		<line x1="16" y1="13" x2="8" y2="13" />
		<line x1="16" y1="17" x2="8" y2="17" />
		<polyline points="10 9 9 9 8 9" />
	</svg>
))

export const HomeIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
		<polyline points="9 22 9 12 15 12 15 22" />
	</svg>
))

export const RefreshIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<polyline points="23 4 23 10 17 10" />
		<path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
	</svg>
))

export const PowerIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<path d="M18.36 6.64a9 9 0 11-12.73 0" />
		<line x1="12" y1="2" x2="12" y2="12" />
	</svg>
))

export const TrendingUpIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
		<polyline points="17 6 23 6 23 12" />
	</svg>
))

export const TrendingDownIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
		<polyline points="17 18 23 18 23 12" />
	</svg>
))

export const SearchIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<circle cx="11" cy="11" r="8" />
		<line x1="21" y1="21" x2="16.65" y2="16.65" />
	</svg>
))

export const ChevronRightIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<polyline points="9 18 15 12 9 6" />
	</svg>
))

export const BellIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
		<path d="M13.73 21a2 2 0 01-3.46 0" />
	</svg>
))

export const ShieldIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
		<polyline points="9 12 11 14 15 10" />
	</svg>
))

export const ZapIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
	</svg>
))

export const MoonIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
	</svg>
))

export const CommandIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<polyline points="4 17 10 11 4 5" />
		<line x1="12" y1="19" x2="20" y2="19" />
	</svg>
))

export const DatabaseIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<ellipse cx="12" cy="5" rx="9" ry="3" />
		<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
		<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
	</svg>
))

export const ClockIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
	</svg>
))

export const GlobeIcon = memo(({ size = 24, color = 'currentColor' } = {}) => (
	<svg xmlns="http://www.w3.org/2000/svg" style={baseStyle(size, color)}>
		<circle cx="12" cy="12" r="10" />
		<line x1="2" y1="12" x2="22" y2="12" />
		<path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
	</svg>
))

// Re-export everything as a named export map for convenience
export default {
	BotIcon, MessageIcon, GroupIcon, UsersIcon, ActivityIcon, ErrorIcon,
	SettingsIcon, PluginsIcon, LogsIcon, HomeIcon, RefreshIcon, PowerIcon,
	TrendingUpIcon, TrendingDownIcon, SearchIcon, ChevronRightIcon, BellIcon,
	ShieldIcon, ZapIcon, MoonIcon, CommandIcon, DatabaseIcon, ClockIcon, GlobeIcon,
}
