import { mount } from 'svelte'
import './main.css'
import App from './App.svelte'

mount(App, {
  target: document.getElementById('app')!,
})
