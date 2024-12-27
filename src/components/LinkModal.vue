<script setup lang="ts">
import type { modalType } from '../interface.vue'
import { useApi, useItems } from '@directus/extensions-sdk'
import { useBrowserLocation, useDebounceFn } from '@vueuse/core'
import { computed, inject, onMounted, ref } from 'vue'

const props = defineProps<{
  selection: any
  type: modalType
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'setLink', payload: object): void
}>()

const interfaceValues = inject('values')
const location = useBrowserLocation()
const q = ref('')
const fileUploadEl = ref(null)

const api = useApi()
const files = ref([])

// Fetch files
async function fetchFiles() {
  try {
    const response = await api.get('/files', {
      params: {
        filter: {
          type: {
            _ncontains: 'image',
          },
        },
      },
    })
    files.value = response.data.data
  }
  catch (error) {
    console.error('Error fetching files:', error)
  }
}

const linkItem = {
  url: ref(''),
  title: ref(''),
  type: ref('default'),
  filesize: ref(0),
}

const linkStyleChoices = ref([
  {
    name: 'default',
    label: 'Default',
    checked: linkItem.type.value === 'default',
  },
  {
    name: 'button',
    label: 'Button',
    checked: linkItem.type.value === 'button',
  },
  {
    name: 'cta',
    label: 'CTA Button',
    checked: linkItem.type.value === 'cta',
  },
  {
    name: 'file',
    label: 'Filedownload',
    checked: linkItem.type.value === 'file',
  },
])

const collections = {
  pages: ref('pages'),
  studies: ref('studies'),
  files: ref('files'),
}

const query = {
  fields: ref(['*', 'translations.*']),
  limit: ref(1),
  sort: ref(null),
  search: ref(''),
  filter: ref(null),
  page: ref(1),
}

const { getItems: getPages, items: pages } = useItems(collections.pages, query)
const { getItems: getStudies, items: studies } = useItems(collections.studies, query)

const allItems = computed(() => {
  let items = []

  if (pages.value.length) {
    items = [...items, ...pages.value.map(item => ({
      ...item,
      type: 'page',
    }))]
  }

  if (studies.value.length) {
    items = [...items, ...studies.value.map(item => ({
      ...item,
      type: 'study',
    }))]
  }

  return items
})

query.limit.value = 10 // update query limit

const result = computed(() => {
  if (!allItems.value?.length)
    return []

  return allItems.value.map((item) => {
    if (!item?.translations?.length)
      return null

    let translation = item.translations[0]
    if (interfaceValues.value?.languages_code) {
      translation = item.translations.find(
        trans => trans?.languages_code === interfaceValues.value.languages_code.code,
      ) || translation // Fallback to first translation if no match
    }

    return translation
  }).filter(Boolean) // Remove null values
})

async function fetchItems() {
  if (q.value && q.value.length > 1) {
    query.filter.value = {
      translations: {
        headline: {
          _contains: q.value,
        },
      },
    }
  }
  else {
    query.filter.value = null
  }

  try {
    await Promise.all([
      getPages(),
      getStudies(),
    ])
  }
  catch (error) {
    console.log(error)
  }
}

function getLanguagePrefix() {
  if (!interfaceValues.value?.languages_code?.code)
    return ''

  return interfaceValues.value.languages_code.code === 'de' ? '' : `/${interfaceValues.value.languages_code.code}`
}

function onButtonClick(item, index) {
  if (!item || !allItems.value[index])
    return

  linkItem.url.value = `${getLanguagePrefix()}/${allItems.value[index].type}/${item.slug}`
  linkItem.title.value = item.headline
}

function setFileLink(file) {
  linkItem.url.value = `${location.value.origin}/assets/${file.id}`
  linkItem.title.value = file.title
  linkItem.filesize.value = file.filesize
}

const onSearch = useDebounceFn(fetchItems, 200)

async function onFileUpload() {
  const file = fileUploadEl.value.files[0]
  if (!file)
    return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    fileUploadEl.value.value = null

    files.value.unshift(response.data.data)
    setFileLink(response.data.data)
  }
  catch (error) {
    console.error('Error uploading file:', error)
  }
}

onMounted(() => {
  if (props.selection) {
    linkItem.url.value = props.selection.link
    linkItem.title.value = props.selection.text
  }

  fetchItems()
  fetchFiles()
})
</script>

<template>
  <VCard
    :title="false"
    class="card"
  >
    <div class="input-group">
      <label for="link-modal-url-input">Enter an URL</label>
      <input
        id="link-modal-url-input"
        v-model="linkItem.url.value"
        class="card-input"
        type="text"
      >
    </div>

    <div class="input-group">
      <label for="link-modal-text-input">Link Text</label>
      <input
        id="link-modal-text-input"
        v-model="linkItem.title.value"
        class="card-input"
        type="text"
      >
    </div>

    <fieldset class="input-group radio-group">
      <legend>Select a link style</legend>
      <div
        v-for="(input, inputIndex) in linkStyleChoices"
        :key="`link-style-choice-${inputIndex}`"
        class="input-radio"
      >
        <label :for="`link-modal-display-${input.name}`">{{ input.label }}</label>
        <input
          :id="`link-modal-display-${input.name}`"
          v-model="linkItem.type"
          type="radio"
          class="card-radio"
          name="link-display"
          :value="input.name"
          :checked="input.checked"
        >
      </div>
    </fieldset>

    <template v-if="type === 'link'">
      <div class="input-group">
        <h2>Or select from the content</h2>
        <label for="link-modal-search-input">Search</label>
        <input
          id="link-modal-search-input"
          v-model="q"
          class="card-input"
          type="text"
          @input="onSearch"
        >
      </div>

      <ul class="list">
        <li
          v-for="(item, index) in result"
          :key="`link-modal-select-item-${item.slug}`"
          class="list-item"
          style="--v-button-width: 100%"
        >
          <button
            class="list-item-button"
            @click="onButtonClick(item, index)"
          >
            <span class="list-item-headline">{{ item?.headline }}</span>
            <span class="list-item-type">{{ allItems[index]?.type }}</span>
          </button>
        </li>
      </ul>
    </template>

    <template v-else-if="type === 'file'">
      <div class="input-group">
        <label for="link-modal-file-input">Upload a file</label>
        <div class="input-upload">
          <input
            id="link-modal-file-input"
            ref="fileUploadEl"
            class="card-input"
            type="file"
          >
          <VButton
            :x-small="true"
            @click="onFileUpload"
          >
            Upload
          </VButton>
        </div>
      </div>
      <ul
        v-if="files"
        class="list"
      >
        <li
          v-for="(file, fileIndex) in files"
          :key="`file-item-${fileIndex}`"
          class="list-item"
        >
          <button
            class="list-item-button"
            @click="setFileLink(file)"
          >
            <span
              class="list-item-headline"
              :title="file.title"
            >{{ file.title }}</span>
            <span class="list-item-type">{{ file.type }}</span>
          </button>
        </li>
      </ul>
    </template>
    <div class="footer">
      <VButton
        :x-small="true"
        :outlined="true"
        @click="emit('cancel')"
      >
        Cancel
      </VButton>
      <VButton
        :x-small="true"
        @click="emit('setLink', linkItem)"
      >
        Add Link
      </VButton>
    </div>
  </VCard>
</template>

<style scoped>
.card {
  --theme--form--field--input--padding: 0px;

  padding: 1rem;
  min-width: 320px;
  width: 100%;
  max-width: 600px;
}

.card-input {
  width: 100%;
  background: transparent;
  border: var(--theme--border-width) solid var(--v-input-border-color, var(--theme--form--field--input--border-color));
  border-radius: var(--v-input-border-radius, var(--theme--border-radius));
  appearance: none;
  padding: 8px;
}

.input-group + .input-group {
  margin-top: 1rem;
}

.list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 1.5rem 1rem 1rem;
  flex-direction: column;
  width: 100%;
  margin-block: 1rem;
  height: 15vh;
  overflow-y: auto;
  gap: 0.5rem;
  background-color: var(--theme--background-accent);
}

.list-item {
  text-align: left;
}

.list-item-button {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.list-item-headline {
  overflow: hidden;
  text-wrap: nowrap;
  text-overflow: ellipsis;
  max-width: 20ch;
}

.list-item-button:hover {
  color: var(--theme--primary);
}

.list-item:not(:last-child) {
  border-bottom: 1px solid grey;
}

.list-item-type {
  text-transform: uppercase;
  font-size: 0.75em;
}

.input-upload {
  display: flex;
  gap: 0.5rem;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.input-radio {
  display: flex;
  flex-direction: row-reverse;
  gap: 0.25rem;
}

.footer {
  display: flex;
  justify-content: space-between;
}
</style>
