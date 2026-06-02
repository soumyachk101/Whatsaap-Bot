import { useEffect, useRef, useState } from 'react'

export function useWebSocket() {
  const [status, setStatus] = useState('disconnected')
  const wsRef = useRef(null)

  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${location.host}`
    let ws

    function connect() {
      ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen  = () => setStatus('connected')
      ws.onclose = () => { setStatus('disconnected'); setTimeout(connect, 5000) }
      ws.onerror = () => { setStatus('disconnected') }

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data)
          if (data.type === 'status') {
            setStatus(data.status === 'connected' ? 'connected' : 'disconnected')
          }
        } catch (_) {}
      }
    }

    connect()
    return () => {
      ws.onclose = null
      ws.close()
    }
  }, [])

  return status
}
