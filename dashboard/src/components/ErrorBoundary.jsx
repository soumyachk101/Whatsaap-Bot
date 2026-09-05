import { Component } from 'react'

export default class ErrorBoundary extends Component {
	constructor(props) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error }
	}

	componentDidCatch(error, errorInfo) {
		console.error('[ErrorBoundary]', error, errorInfo)
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null })
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					minHeight: '50vh',
					gap: '1.25rem',
					padding: '2rem',
				}}>
					<div style={{
						width: 56,
						height: 56,
						borderRadius: 'var(--radius-lg)',
						background: 'var(--rose-bg)',
						border: '1px solid var(--rose-border)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}>
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
					</div>
					<div style={{ textAlign: 'center' }}>
						<h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
							Something went wrong
						</h2>
						<p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 360, lineHeight: 1.6 }}>
							{this.state.error?.message || 'An unexpected error occurred in this section.'}
						</p>
					</div>
					<button className="btn btn-primary" onClick={this.handleReset} style={{ marginTop: '0.5rem' }}>
						Try Again
					</button>
				</div>
			)
		}
		return this.props.children
	}
}
