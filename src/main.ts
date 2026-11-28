import { mount } from 'svelte'
import { registerSW } from 'virtual:pwa-register'
import App from './App.svelte'
// früh laden: die Installationsaufforderung des Browsers kommt kurz nach dem Start
import './lib/installieren.svelte'
import './app.css'

// Service Worker: App nach dem ersten Aufruf offline nutzbar, Updates automatisch
registerSW({ immediate: true })

export default mount(App, { target: document.getElementById('app') as HTMLElement })
