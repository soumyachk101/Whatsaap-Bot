import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getGroups,
  syncGroups,
  updateGroup,
  getCommands,
  getGroupMetadata,
  sendGroupMessage,
  leaveGroup,
  getGroupInvite
} from '../lib/api.js'
import { useToast } from '../App.jsx'
import {
  Users,
  Search,
  RotateCw,
  Crown,
  Shield,
  ShieldAlert,
  Bot,
  Sparkles,
  Image,
  Smile,
  Phone,
  Lock,
  MessageSquare,
  Send,
  Link,
  LogOut,
  Pencil,
  Check,
  Copy,
  X,
  AlertTriangle,
  Ban,
  Radio,
  SlidersHorizontal
} from 'lucide-react'

const SORTS = [
  { key: 'totalmsg', label: 'Volume' },
  { key: 'memberCount', label: 'Members' },
  { key: 'isBotOn', label: 'Active First' },
  { key: 'name', label: 'Name (A-Z)' }
]

const FILTER_TABS = [
  { key: 'all', label: 'All Groups' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Off' },
  { key: 'inGroup', label: 'In Group' },
  { key: 'admin', label: 'Bot Admin' },
  { key: 'antilink', label: 'Anti-Link' }
]

const CONTROL_DEFINITIONS = [
  { field: 'isBotOn', label: 'Bot Active', desc: 'Auto-reply engine', icon: Bot },
  { field: 'adminOnly', label: 'Admin Only', desc: 'Only admins trigger', icon: Shield },
  { field: 'antilink', label: 'Anti-Link', desc: 'Auto-delete links', icon: Link },
  { field: 'nsfw', label: 'NSFW Filter', desc: 'Block mature media', icon: ShieldAlert },
  { field: 'isChatBotOn', label: 'AI Chatbot', desc: 'Natural conversations', icon: Sparkles },
  { field: 'isImgOn', label: 'Image Gen', desc: 'AI media generation', icon: Image },
  { field: 'isAutoStickerOn', label: 'Auto Sticker', desc: 'Convert media to sticker', icon: Smile },
  { field: 'is91Only', label: '+91 Only', desc: 'Restrict international', icon: Phone },
  { field: 'restrictedMode', label: 'Restricted', desc: 'Essential commands only', icon: Lock }
]

function getAvatarGradient(id = '') {
  const gradients = [
    'linear-gradient(135deg, #4f8ef7 0%, #74a8f7 100%)',
    'linear-gradient(135deg, #f5a623 0%, #f7bd5a 100%)',
    'linear-gradient(135deg, #6b7080 0%, #9ca1b5 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #8b5cf6 100%)',
    'linear-gradient(135deg, #f0544f 0%, #f77d7a 100%)',
    'linear-gradient(135deg, #34c77b 0%, #5ddc9a 100%)'
  ]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i)
  return gradients[Math.abs(hash) % gradients.length]
}

function getInitials(name = '') {
  const cleaned = name.trim()
  if (!cleaned) return 'WA'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return cleaned.slice(0, 2).toUpperCase()
}

function GroupCard({
  grp,
  allCommands,
  onUpdate,
  onAddBlock,
  onRemoveBlock,
  onOpenMembers,
  onOpenAnnounce,
  onOpenInvite,
  onLeaveGroup
}) {
  const [selectedCmd, setSelectedCmd] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(null) // null | 'automations' | 'blocks'
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(grp.grpName || '')
  const [welcomeInput, setWelcomeInput] = useState(grp.welcome || '')
  const [goodbyeInput, setGoodbyeInput] = useState(grp.goodbye || '')
  const [copiedJid, setCopiedJid] = useState(false)

  useEffect(() => {
    setNameInput(grp.grpName || '')
    setWelcomeInput(grp.welcome || '')
    setGoodbyeInput(grp.goodbye || '')
  }, [grp])

  const handleToggle = async (field, val) => {
    setLoading(true)
    await onUpdate(grp._id, { [field]: val })
    setLoading(false)
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setLoading(true)
    await onUpdate(grp._id, { grpName: nameInput.trim() })
    setIsEditingName(false)
    setLoading(false)
  }

  const handleSaveAutomations = async () => {
    setLoading(true)
    await onUpdate(grp._id, { welcome: welcomeInput.trim(), goodbye: goodbyeInput.trim() })
    setLoading(false)
  }

  const copyJid = () => {
    navigator.clipboard?.writeText(grp._id)
    setCopiedJid(true)
    setTimeout(() => setCopiedJid(false), 2000)
  }

  const insertVariable = (target, tag) => {
    if (target === 'welcome') {
      setWelcomeInput(prev => (prev ? `${prev} ${tag}` : tag))
    } else {
      setGoodbyeInput(prev => (prev ? `${prev} ${tag}` : tag))
    }
  }

  const available = allCommands.filter(c => !(grp.cmdBlocked || []).includes(c))
  const memberCount = grp.members?.length || grp.memberCount || 0
  const isConnected = grp.inGroup !== false
  const totalMsgs = grp.totalMsgCount || grp.totalmsg || 0
  const blockedCount = grp.cmdBlocked?.length || 0

  return (
    <div className="group-card">
      {/* Top Status Border Indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: grp.isBotOn
            ? 'linear-gradient(90deg, var(--primary) 0%, #74a8f7 100%)'
            : 'var(--timber)',
          transition: 'background 0.3s ease'
        }}
      />

      {/* Header section with Group Identity */}
      <div style={{ paddingBottom: '0.85rem', marginBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
          {/* Avatar Monogram */}
          <div className="group-avatar" style={{ background: getAvatarGradient(grp._id) }}>
            {getInitials(grp.grpName)}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            {isEditingName ? (
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <input
                  className="input"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '0.3rem 0.55rem', flex: 1 }}
                  placeholder="Group name..."
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveName}
                  disabled={loading}
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
                >
                  <Check size={12} />
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setNameInput(grp.grpName || '')
                    setIsEditingName(false)
                  }}
                  style={{ padding: '0.3rem 0.45rem', fontSize: '0.72rem' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <h3
                  title={grp.grpName}
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25,
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}
                >
                  {grp.grpName || 'Unnamed Group'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  title="Rename Group"
                  className="icon-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    opacity: 0.7,
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}

            {/* JID Badge with Instant Copy Feedback */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
              <button
                type="button"
                onClick={copyJid}
                title="Click to copy JID"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.64rem',
                  color: copiedJid ? 'var(--emerald)' : 'var(--text-faint)',
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'color 0.15s ease'
                }}
              >
                {copiedJid ? (
                  <>
                    <Check size={11} color="var(--emerald)" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={10} style={{ opacity: 0.6 }} />
                    <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {grp._id}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status Badges */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0, alignItems: 'center' }}>
            {grp.isBotAdmin && (
              <span className="badge badge-indigo" title="Bot is group admin" style={{ fontSize: '0.6rem', padding: '0.12rem 0.45rem' }}>
                <Crown size={11} strokeWidth={2.2} />
                Admin
              </span>
            )}
            <span
              className={`badge ${isConnected ? 'badge-emerald' : 'badge-zinc'}`}
              title={isConnected ? 'Bot is in this group' : 'Bot has left or was removed'}
              style={{ fontSize: '0.6rem', padding: '0.12rem 0.45rem' }}
            >
              <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} style={{ width: 5, height: 5 }} />
              {isConnected ? 'In Group' : 'Left'}
            </span>
          </div>
        </div>

        {grp.desc && (
          <p
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              lineHeight: 1.45,
              marginTop: '0.35rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {grp.desc}
          </p>
        )}
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', marginBottom: '0.85rem' }}>
        <div className="group-stat-box">
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Messages
          </span>
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
            {totalMsgs.toLocaleString()}
          </span>
        </div>
        <div className="group-stat-box">
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Members
          </span>
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
            {memberCount.toLocaleString()}
          </span>
        </div>
        <div className="group-stat-box">
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Blocked
          </span>
          <span
            style={{
              fontSize: '0.86rem',
              fontWeight: 700,
              color: blockedCount > 0 ? 'var(--rose)' : 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: '2px'
            }}
          >
            {blockedCount}
          </span>
        </div>
      </div>

      {/* Dynamic Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 0.6rem', marginBottom: '0.75rem' }}>
        {CONTROL_DEFINITIONS.map(item => {
          const isChecked = Boolean(grp[item.field])
          const IconComponent = item.icon
          return (
            <div key={item.field} className={`control-item ${isChecked ? 'active' : ''}`}>
              <div style={{ minWidth: 0, paddingRight: '0.3rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isChecked ? 'rgba(79, 142, 247, 0.15)' : 'rgba(26, 29, 43, 0.05)',
                    color: isChecked ? 'var(--primary)' : 'var(--text-muted)',
                    flexShrink: 0
                  }}
                >
                  <IconComponent size={12} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isChecked ? 'var(--text-main)' : 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              </div>
              <label className="toggle" style={{ cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={e => handleToggle(item.field, e.target.checked)}
                  disabled={loading}
                />
                <div className="toggle-track">
                  <div className="toggle-thumb" />
                </div>
              </label>
            </div>
          )
        })}
      </div>

      {/* Accordion Tabs for Automations & Blocked Commands */}
      <div style={{ display: 'flex', gap: '0.45rem', borderTop: '1px solid var(--border)', paddingTop: '0.65rem', marginTop: 'auto' }}>
        <button
          type="button"
          className="action-bar-btn"
          onClick={() => setActiveTab(activeTab === 'automations' ? null : 'automations')}
          style={{
            flex: 1,
            color: activeTab === 'automations' ? 'var(--primary)' : 'var(--text-muted)',
            background: activeTab === 'automations' ? 'rgba(79, 142, 247, 0.12)' : '#f1f3f9',
            borderColor: activeTab === 'automations' ? 'rgba(79, 142, 247, 0.3)' : 'var(--border)'
          }}
        >
          <MessageSquare size={13} />
          <span>Auto Messages</span>
        </button>
        <button
          type="button"
          className="action-bar-btn"
          onClick={() => setActiveTab(activeTab === 'blocks' ? null : 'blocks')}
          style={{
            flex: 1,
            color: activeTab === 'blocks' ? 'var(--primary)' : 'var(--text-muted)',
            background: activeTab === 'blocks' ? 'rgba(79, 142, 247, 0.12)' : '#f1f3f9',
            borderColor: activeTab === 'blocks' ? 'rgba(79, 142, 247, 0.3)' : 'var(--border)'
          }}
        >
          <Ban size={13} />
          <span>Blocked ({blockedCount})</span>
        </button>
      </div>

      {/* Tab Drawer: Automations (Welcome & Goodbye) */}
      {activeTab === 'automations' && (
        <div
          style={{
            padding: '0.75rem',
            marginTop: '0.5rem',
            background: '#f1f3f9',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Welcome Message
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {['{user}', '{group}'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariable('welcome', tag)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="input"
            rows={2}
            value={welcomeInput}
            onChange={e => setWelcomeInput(e.target.value)}
            placeholder="Type 'off' to disable, or welcome text..."
            style={{ width: '100%', fontSize: '0.72rem', padding: '0.4rem', marginBottom: '0.5rem', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Goodbye Message
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {['{user}', '{group}'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariable('goodbye', tag)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="input"
            rows={2}
            value={goodbyeInput}
            onChange={e => setGoodbyeInput(e.target.value)}
            placeholder="Type 'off' to disable, or farewell text..."
            style={{ width: '100%', fontSize: '0.72rem', padding: '0.4rem', marginBottom: '0.5rem', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAutomations}
              disabled={loading}
              style={{ fontSize: '0.7rem', padding: '0.3rem 0.75rem' }}
            >
              <Check size={12} />
              Save Messages
            </button>
          </div>
        </div>
      )}

      {/* Tab Drawer: Blocked Commands */}
      {activeTab === 'blocks' && (
        <div
          style={{
            padding: '0.75rem',
            marginTop: '0.5rem',
            background: '#f1f3f9',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Disabled in this group ({blockedCount})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem', maxHeight: '90px', overflowY: 'auto' }}>
            {blockedCount ? (
              grp.cmdBlocked.map(c => (
                <span
                  key={c}
                  className="badge badge-rose"
                  style={{
                    padding: '0.12rem 0.45rem',
                    fontSize: '0.62rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  #{c}
                  <button
                    type="button"
                    onClick={() => onRemoveBlock(grp._id, c)}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: 0, opacity: 0.8 }}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>All commands allowed</span>
            )}
          </div>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (selectedCmd) {
                onAddBlock(grp._id, selectedCmd)
                setSelectedCmd('')
              }
            }}
            style={{ display: 'flex', gap: '0.3rem' }}
          >
            <select
              className="input"
              style={{ fontSize: '0.72rem', padding: '0.32rem 0.5rem', flex: 1, fontFamily: "'JetBrains Mono', monospace" }}
              value={selectedCmd}
              onChange={e => setSelectedCmd(e.target.value)}
            >
              <option value="">Block command...</option>
              {available.map(c => (
                <option key={c} value={c}>
                  #{c}
                </option>
              ))}
            </select>
            <button
              className="btn btn-secondary"
              type="submit"
              disabled={!selectedCmd}
              style={{ fontSize: '0.72rem', padding: '0.32rem 0.65rem' }}
            >
              Block
            </button>
          </form>
        </div>
      )}

      {/* Action Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.4rem',
          marginTop: '0.75rem',
          paddingTop: '0.65rem',
          borderTop: '1px solid var(--border)'
        }}
      >
        <button
          type="button"
          className="action-bar-btn"
          onClick={() => onOpenMembers(grp)}
          title="View Member List"
        >
          <Users size={13} />
          <span>Members</span>
        </button>
        <button
          type="button"
          className="action-bar-btn"
          onClick={() => onOpenAnnounce(grp)}
          title="Send Group Message"
        >
          <Send size={13} />
          <span>Message</span>
        </button>
        <button
          type="button"
          className="action-bar-btn"
          onClick={() => onOpenInvite(grp)}
          title="Fetch Group Invite Link"
        >
          <Link size={13} />
          <span>Invite</span>
        </button>
        <button
          type="button"
          className="action-bar-btn danger"
          onClick={() => onLeaveGroup(grp)}
          title="Leave Group"
        >
          <LogOut size={13} />
          <span>Leave</span>
        </button>
      </div>
    </div>
  )
}

export default function Groups() {
  const toast = useToast()
  const [groups, setGroups] = useState([])
  const [allCommands, setAllCommands] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('totalmsg')
  const [filterTab, setFilterTab] = useState('all')

  // Modals state
  const [memberModal, setMemberModal] = useState({ open: false, grp: null, loading: false, data: null, query: '' })
  const [announceModal, setAnnounceModal] = useState({ open: false, grp: null, message: '', sending: false })
  const [inviteModal, setInviteModal] = useState({ open: false, grp: null, link: '', loading: false })
  const [leaveModal, setLeaveModal] = useState({ open: false, grp: null, leaving: false })

  const loadData = useCallback(async () => {
    try {
      const [grps, cmds] = await Promise.all([getGroups(), getCommands()])
      setGroups(grps || [])
      const set = new Set()
      if (cmds) {
        ;['publicCommands', 'groupCommands', 'adminCommands', 'ownerCommands'].forEach(cat => {
          if (Array.isArray(cmds[cat])) {
            cmds[cat].forEach(item => {
              if (Array.isArray(item.cmd)) item.cmd.forEach(c => set.add(c))
            })
          }
        })
      }
      setAllCommands(Array.from(set).sort())
    } catch {
      toast('Failed to load groups', false)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Sync groups directly from WhatsApp
  const handleSyncWhatsApp = async () => {
    setSyncing(true)
    try {
      const res = await syncGroups()
      toast(`Successfully synced ${res.synced || 0} groups from WhatsApp!`, true)
      await loadData()
    } catch (err) {
      toast(err.message || 'WhatsApp sync failed', false)
    } finally {
      setSyncing(false)
    }
  }

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    return [...groups]
      .filter(g => {
        if (q) {
          const nameMatch = (g.grpName || '').toLowerCase().includes(q)
          const idMatch = (g._id || '').toLowerCase().includes(q)
          const descMatch = (g.desc || '').toLowerCase().includes(q)
          if (!nameMatch && !idMatch && !descMatch) return false
        }

        if (filterTab === 'active') return g.isBotOn !== false
        if (filterTab === 'inactive') return g.isBotOn === false
        if (filterTab === 'inGroup') return g.inGroup !== false
        if (filterTab === 'admin') return Boolean(g.isBotAdmin)
        if (filterTab === 'antilink') return Boolean(g.antilink)

        return true
      })
      .sort((a, b) => {
        if (sort === 'totalmsg') return (b.totalMsgCount || b.totalmsg || 0) - (a.totalMsgCount || a.totalmsg || 0)
        if (sort === 'memberCount') return (b.members?.length || b.memberCount || 0) - (a.members?.length || a.memberCount || 0)
        if (sort === 'isBotOn') return a.isBotOn === b.isBotOn ? 0 : a.isBotOn ? -1 : 1
        if (sort === 'name') return (a.grpName || '').localeCompare(b.grpName || '')
        return 0
      })
  }, [groups, search, sort, filterTab])

  async function handleUpdate(jid, data) {
    const prev = [...groups]
    setGroups(g => g.map(x => (x._id === jid ? { ...x, ...data } : x)))
    try {
      await updateGroup(jid, data)
      toast('Group settings updated', true)
    } catch (err) {
      setGroups(prev)
      toast(err.message, false)
    }
  }

  async function handleAddBlock(jid, cmd) {
    const grp = groups.find(g => g._id === jid)
    if (!grp) return
    const updated = [...new Set([...(grp.cmdBlocked || []), cmd])]
    setGroups(prev => prev.map(g => (g._id === jid ? { ...g, cmdBlocked: updated } : g)))
    try {
      await updateGroup(jid, { cmdBlocked: updated })
      toast(`Blocked #${cmd}`, true)
    } catch (err) {
      setGroups(prev => prev.map(g => (g._id === jid ? { ...g, cmdBlocked: grp.cmdBlocked } : g)))
      toast(err.message, false)
    }
  }

  async function handleRemoveBlock(jid, cmd) {
    const grp = groups.find(g => g._id === jid)
    if (!grp) return
    const updated = (grp.cmdBlocked || []).filter(c => c !== cmd)
    setGroups(prev => prev.map(g => (g._id === jid ? { ...g, cmdBlocked: updated } : g)))
    try {
      await updateGroup(jid, { cmdBlocked: updated })
      toast(`Unblocked #${cmd}`, true)
    } catch (err) {
      setGroups(prev => prev.map(g => (g._id === jid ? { ...g, cmdBlocked: grp.cmdBlocked } : g)))
      toast(err.message, false)
    }
  }

  // Open Members Modal
  const handleOpenMembers = async grp => {
    setMemberModal({ open: true, grp, loading: true, data: null, query: '' })
    try {
      const res = await getGroupMetadata(grp._id)
      setMemberModal({ open: true, grp, loading: false, data: res, query: '' })
    } catch (err) {
      toast(err.message || 'Failed to fetch group members', false)
      setMemberModal(prev => ({ ...prev, loading: false }))
    }
  }

  // Open Announce Modal
  const handleOpenAnnounce = grp => {
    setAnnounceModal({ open: true, grp, message: '', sending: false })
  }

  const handleSendAnnouncement = async () => {
    if (!announceModal.message.trim()) return
    setAnnounceModal(prev => ({ ...prev, sending: true }))
    try {
      await sendGroupMessage(announceModal.grp._id, announceModal.message.trim())
      toast(`Message dispatched to ${announceModal.grp.grpName || 'group'}`, true)
      setAnnounceModal({ open: false, grp: null, message: '', sending: false })
    } catch (err) {
      toast(err.message || 'Failed to send message', false)
      setAnnounceModal(prev => ({ ...prev, sending: false }))
    }
  }

  // Open Invite Modal
  const handleOpenInvite = async grp => {
    setInviteModal({ open: true, grp, link: '', loading: true })
    try {
      const res = await getGroupInvite(grp._id)
      setInviteModal({ open: true, grp, link: res.link || '', loading: false })
    } catch (err) {
      toast(err.message || 'Failed to get invite link', false)
      setInviteModal({ open: false, grp: null, link: '', loading: false })
    }
  }

  // Handle Leave Group
  const handleLeaveGroup = async () => {
    if (!leaveModal.grp) return
    setLeaveModal(prev => ({ ...prev, leaving: true }))
    try {
      await leaveGroup(leaveModal.grp._id)
      toast(`Successfully left: ${leaveModal.grp.grpName}`, true)
      setGroups(prev => prev.map(g => (g._id === leaveModal.grp._id ? { ...g, inGroup: false, isBotOn: false } : g)))
      setLeaveModal({ open: false, grp: null, leaving: false })
    } catch (err) {
      toast(err.message || 'Failed to leave group', false)
      setLeaveModal(prev => ({ ...prev, leaving: false }))
    }
  }

  // Keyboard escape listeners for modals
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (memberModal.open) setMemberModal({ open: false, grp: null, loading: false, data: null, query: '' })
        if (announceModal.open) setAnnounceModal({ open: false, grp: null, message: '', sending: false })
        if (inviteModal.open) setInviteModal({ open: false, grp: null, link: '', loading: false })
        if (leaveModal.open) setLeaveModal({ open: false, grp: null, leaving: false })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [memberModal.open, announceModal.open, inviteModal.open, leaveModal.open])

  const activeCount = groups.filter(g => g.isBotOn !== false).length
  const inGroupCount = groups.filter(g => g.inGroup !== false).length

  // Filtered members in modal
  const filteredParticipants = useMemo(() => {
    if (!memberModal.data?.participants) return []
    const q = (memberModal.query || '').trim().toLowerCase()
    if (!q) return memberModal.data.participants
    return memberModal.data.participants.filter(p => {
      const jid = p.id || p.jid || ''
      return jid.toLowerCase().includes(q)
    })
  }, [memberModal.data, memberModal.query])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div>
          <h1 className="section-title">
            <Users size={22} style={{ color: 'var(--primary)' }} />
            Group Management
          </h1>
          <p className="section-subtitle">
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--text-main)' }}>{groups.length}</span> groups configured ·{' '}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--primary)' }}>{activeCount}</span> active ·{' '}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--secondary)' }}>{inGroupCount}</span> connected
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSyncWhatsApp}
            disabled={syncing}
            style={{
              fontSize: '0.78rem',
              padding: '0.45rem 0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <RotateCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync WhatsApp Groups'}
          </button>

          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none'
              }}
            />
            <input
              className="input"
              placeholder="Filter by name, JID, description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.2rem', width: '240px', fontSize: '0.78rem' }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Sort Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f3f9',
            padding: '3px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            gap: '4px'
          }}
        >
          {FILTER_TABS.map(tab => {
            const active = filterTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterTab(tab.key)}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: active ? 700 : 600,
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? '#ffffff' : 'var(--text-muted)',
                  border: active ? '1px solid var(--primary)' : '1px solid transparent'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <SlidersHorizontal size={12} />
            Sort:
          </span>
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f3f9',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              gap: '4px'
            }}
          >
            {SORTS.map(s => {
              const active = sort === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`btn ${active ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setSort(s.key)}
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: active ? 700 : 600,
                    background: active ? 'var(--timber)' : 'transparent',
                    color: active ? 'var(--text-main)' : 'var(--text-muted)'
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Grid of Groups */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '36vh', gap: '0.85rem' }}>
          <div className="spinner" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading group configuration...</span>
        </div>
      ) : rows.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {rows.map(g => (
            <GroupCard
              key={g._id}
              grp={g}
              allCommands={allCommands}
              onUpdate={handleUpdate}
              onAddBlock={handleAddBlock}
              onRemoveBlock={handleRemoveBlock}
              onOpenMembers={handleOpenMembers}
              onOpenAnnounce={handleOpenAnnounce}
              onOpenInvite={handleOpenInvite}
              onLeaveGroup={grp => setLeaveModal({ open: true, grp, leaving: false })}
            />
          ))}
        </div>
      ) : (
        <div className="card empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: '#f1f3f9',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'var(--primary)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Users size={24} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            No groups match your query
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '1.25rem', maxWidth: '400px', margin: '0 auto 1.25rem' }}>
            {search
              ? 'Try modifying your search filter or clearing search keywords.'
              : 'Sync active WhatsApp conversations to populate your bot control dashboard.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSyncWhatsApp}
            disabled={syncing}
            style={{ margin: '0 auto', fontSize: '0.78rem' }}
          >
            <RotateCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            Sync from WhatsApp
          </button>
        </div>
      )}

      {/* ── Modal: Members ── */}
      {memberModal.open && (
        <div className="modal-overlay" onClick={() => setMemberModal({ open: false, grp: null, loading: false, data: null, query: '' })}>
          <div className="modal-dialog" style={{ maxWidth: '540px', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.15rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="group-avatar" style={{ width: 34, height: 34, fontSize: '0.85rem', background: getAvatarGradient(memberModal.grp?._id) }}>
                  {getInitials(memberModal.grp?.grpName)}
                </div>
                <div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {memberModal.grp?.grpName || 'Group Members'}
                  </h3>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {memberModal.grp?._id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setMemberModal({ open: false, grp: null, loading: false, data: null, query: '' })}
                style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Inner Search & Stats */}
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Total: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-main)', fontWeight: 700 }}>{memberModal.data?.participants?.length || 0}</span>
              </span>
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={12} style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  placeholder="Filter phone..."
                  value={memberModal.query}
                  onChange={e => setMemberModal(prev => ({ ...prev, query: e.target.value }))}
                  style={{ paddingLeft: '1.75rem', fontSize: '0.72rem', padding: '0.3rem 0.5rem 0.3rem 1.75rem' }}
                />
              </div>
            </div>

            {memberModal.loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', gap: '0.75rem' }}>
                <div className="spinner" />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Querying WhatsApp metadata...</span>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {filteredParticipants.length ? (
                  filteredParticipants.map((p, idx) => {
                    const pJid = p.id || p.jid || ''
                    const phone = pJid.split('@')[0].split(':')[0]
                    const isAdmin = p.admin === 'admin' || p.admin === 'superadmin'
                    const isSuper = p.admin === 'superadmin'
                    return (
                      <div
                        key={pJid || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.45rem 0.75rem',
                          background: '#f1f3f9',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          +{phone}
                        </span>
                        {isAdmin && (
                          <span className={`badge ${isSuper ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '0.62rem', padding: '0.1rem 0.45rem' }}>
                            {isSuper ? <Crown size={11} strokeWidth={2.4} /> : <Shield size={11} strokeWidth={2.4} />}
                            {isSuper ? 'Group Creator' : 'Group Admin'}
                          </span>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    No participants matched your search
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Announce / Send Message ── */}
      {announceModal.open && (
        <div className="modal-overlay" onClick={() => setAnnounceModal({ open: false, grp: null, message: '', sending: false })}>
          <div className="modal-dialog" style={{ maxWidth: '480px', padding: '1.35rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Send size={14} />
                </div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Dispatch to {announceModal.grp?.grpName || 'Group'}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setAnnounceModal({ open: false, grp: null, message: '', sending: false })}
                style={{ padding: '0.3rem 0.45rem' }}
              >
                <X size={15} />
              </button>
            </div>

            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              The bot will transmit this message into the group stream immediately.
            </p>

            <textarea
              className="input"
              rows={4}
              value={announceModal.message}
              onChange={e => setAnnounceModal(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Write your broadcast message..."
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.6rem', marginBottom: '0.85rem' }}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setAnnounceModal({ open: false, grp: null, message: '', sending: false })}
                style={{ fontSize: '0.76rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendAnnouncement}
                disabled={!announceModal.message.trim() || announceModal.sending}
                style={{ fontSize: '0.76rem' }}
              >
                <Send size={13} />
                {announceModal.sending ? 'Transmitting...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Invite Link ── */}
      {inviteModal.open && (
        <div className="modal-overlay" onClick={() => setInviteModal({ open: false, grp: null, link: '', loading: false })}>
          <div className="modal-dialog" style={{ maxWidth: '440px', padding: '1.35rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Link size={14} />
                </div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Group Invite Link
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setInviteModal({ open: false, grp: null, link: '', loading: false })}
                style={{ padding: '0.3rem 0.45rem' }}
              >
                <X size={15} />
              </button>
            </div>

            {inviteModal.loading ? (
              <div style={{ padding: '1.75rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 0.65rem' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Generating WhatsApp invite code...</span>
              </div>
            ) : (
              <div>
                <input
                  className="input"
                  readOnly
                  value={inviteModal.link || 'Bot must be group admin to generate invite link'}
                  style={{
                    width: '100%',
                    fontSize: '0.76rem',
                    padding: '0.55rem',
                    marginBottom: '0.85rem',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (inviteModal.link) {
                        navigator.clipboard?.writeText(inviteModal.link)
                        toast('Invite link copied to clipboard', true)
                      }
                    }}
                    disabled={!inviteModal.link}
                    style={{ fontSize: '0.76rem' }}
                  >
                    <Copy size={13} />
                    Copy Invite Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Leave Confirmation ── */}
      {leaveModal.open && (
        <div className="modal-overlay" onClick={() => setLeaveModal({ open: false, grp: null, leaving: false })}>
          <div
            className="modal-dialog"
            style={{ maxWidth: '420px', padding: '1.35rem', border: '1px solid rgba(240, 84, 79, 0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(240, 84, 79, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0544f' }}>
                <AlertTriangle size={18} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f0544f' }}>
                Disconnect From Group?
              </h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.15rem' }}>
              Are you sure you want the bot to leave <strong>{leaveModal.grp?.grpName || 'this group'}</strong>?
              Automated responses and administrative tools will cease functioning in this chat.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setLeaveModal({ open: false, grp: null, leaving: false })}
                style={{ fontSize: '0.76rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleLeaveGroup}
                disabled={leaveModal.leaving}
                style={{ fontSize: '0.76rem' }}
              >
                <LogOut size={13} />
                {leaveModal.leaving ? 'Leaving...' : 'Yes, Leave Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
