import { mount } from 'svelte'
import { registerSW } from 'virtual:pwa-register'
import App from './App.svelte'
import './app.css'

// Service Worker: App nach dem ersten Aufruf offline nutzbar, Updates automatisch
registerSW({ immediate: true })

export default mount(App, { target: document.getElementById('app') as HTMLElement })
