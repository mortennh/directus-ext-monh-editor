import { defineInterface } from '@directus/extensions-sdk'
import InterfaceComponent from './interface.vue'
// import './styles.css';

export default defineInterface({
  id: 'monh-editor',
  name: 'MONH Editor',
  icon: 'edit',
  description: 'Custom Editor for our needs',
  component: InterfaceComponent,
  options: null,
  types: ['text'],
})
