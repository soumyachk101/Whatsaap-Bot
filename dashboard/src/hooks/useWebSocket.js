import { useEffect, useState } from 'react'
import { getHealth } from '../lib/api.js'

export function useWebSocket() {
  const [status, setStatus] = useState('connected')

  useEffect(() => {
    let isMounted = true

    const checkStatus = () => {
      getHealth()
        .then(res => {
          if (isMounted) {
            setStatus(res && res.connected !== false ? 'connected' : 'disconnected')
          }
        })
        .catch(() => {
          if (isMounted) setStatus('disconnected')
        })
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10000) // Poll every 10s smoothly

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return status
}
//Done
