<script setup lang="ts">
import type { ModalType } from '../interface.vue'
import { useApi } from '@directus/extensions-sdk'
import { useBrowserLocation, useDebounceFn } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  selection: any
  type: ModalType
  linkStyles?: string[]
  currentLang?: string | null
}>()

const DEFAULT_LANG = 'en-US'

const COLLECTIONS = [
  { collection: 'projects' },
  { collection: 'publications' },
  { collection: 'events' },
  { collection: 'posts' },
  { collection: 'pages' },
  { collection: 'institutions' },
  { collection: 'jobs' },
  { collection: 'researcher_of_month' },
]

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'setLink', payload: object): void
}>()

const api = useApi()
const location = useBrowserLocation()

// --- Link form state ---

const linkItem = {
  url: ref(''),
  title: ref(''),
  type: ref('default'),
  filesize: ref(0),
}

// --- Link styles ---

const ALL_LINK_STYLES = [
  { name: 'default', label: 'Default' },
  { name: 'button', label: 'Button' },
  { name: 'cta', label: 'CTA Button' },
  { name: 'file', label: 'File Download' },
]

const visibleLinkStyles = computed(() => {
  if (!props.linkStyles || props.linkStyles.length === 0)
    return ALL_LINK_STYLES
  // 'file' style is always included when the modal is opened as 'file' type
  const allowed = new Set([...props.linkStyles, 'file'])
  return ALL_LINK_STYLES.filter(s => allowed.has(s.name))
})

// --- Internal collection search ---

interface CollectionItem {
  id: string
  title: string
  slug: string
  langCode: string | null
  _collection: string
}

const q = ref('')
const allItems = ref<CollectionItem[]>([])
// Language filter — auto-set from prop when available, user can override
const selectedLang = ref<string | null>(props.currentLang ?? null)

const availableLangs = computed(() => {
  const langs = [...new Set(allItems.value.map(i => i.langCode).filter(Boolean))] as string[]
  return langs.sort()
})

const internalItems = computed(() =>
  selectedLang.value
    ? allItems.value.filter(i => i.langCode === selectedLang.value || i.langCode === null)
    : allItems.value,
)

async function fetchInternalItems() {
  const results = await Promise.all(
    COLLECTIONS.map((col) => {
      const { collection } = col
      const titleField = 'title'
      const slugField = 'slug'
      const translationsRelation = 'translations'

      if (translationsRelation) {
        return api.get(`/items/${collection}`, {
          params: {
            fields: ['id', `${translationsRelation}.${titleField}`, `${translationsRelation}.${slugField}`, `${translationsRelation}.languages_code`],
            limit: 50,
            filter: {
              _and: [
                { status: { _eq: 'published' } },
                ...(q.value ? [{ [translationsRelation]: { [titleField]: { _icontains: q.value } } }] : []),
              ],
            },
          },
        })
          .then(r => (r.data.data as any[]).flatMap((item) => {
            const translations: any[] = item[translationsRelation] ?? []
            // Return one list entry per translation that has both a slug and a language code
            return translations
              .filter(t => t[slugField] && t.languages_code)
              .map(t => ({
                id: item.id,
                title: t[titleField] || '',
                slug: t[slugField],
                langCode: t.languages_code as string,
                _collection: collection,
              }))
          }))
          .catch(() => [])
      }

      // Direct fields (non-translated collections)
      return api.get(`/items/${collection}`, {
        params: {
          fields: ['id', titleField, slugField],
          limit: 50,
          search: q.value || undefined,
          filter: { status: { _eq: 'published' } },
        },
      })
        .then(r => (r.data.data as any[]).map(item => ({
          id: item.id,
          title: item[titleField],
          slug: item[slugField],
          langCode: null,
          _collection: collection,
        })))
        .catch(() => [])
    }),
  )

  allItems.value = results.flat()
  // Auto-select language when currentLang becomes known (saved translation row)
  if (props.currentLang && !selectedLang.value)
    selectedLang.value = props.currentLang
}

const onSearch = useDebounceFn(fetchInternalItems, 200)

function selectInternalItem(item: CollectionItem) {
  const isDefault = item.langCode === DEFAULT_LANG
  const shortLang = item.langCode ? item.langCode.split('-')[0] : null
  const langPrefix = shortLang && !isDefault ? `/${shortLang}` : ''
  linkItem.url.value = `${langPrefix}/${item._collection}/${item.slug}`
  linkItem.title.value = item.title
}

// --- File browser ---

const fileUploadEl = ref<HTMLInputElement | null>(null)
const files = ref<any[]>([])

async function fetchFiles() {
  try {
    const response = await api.get('/files', {
      params: { filter: { type: { _ncontains: 'image' } } },
    })
    files.value = response.data.data
  }
  catch (error) {
    console.error('Error fetching files:', error)
  }
}

function selectFile(file: any) {
  linkItem.url.value = `${location.value.origin}/assets/${file.id}`
  linkItem.title.value = file.title
  linkItem.filesize.value = file.filesize
  linkItem.type.value = 'file'
}

async function onFileUpload() {
  const file = fileUploadEl.value?.files?.[0]
  if (!file)
    return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (fileUploadEl.value)
      fileUploadEl.value.value = ''
    files.value.unshift(response.data.data)
    selectFile(response.data.data)
  }
  catch (error) {
    console.error('Error uploading file:', error)
  }
}

// --- Init ---

onMounted(() => {
  if (props.selection) {
    linkItem.url.value = props.selection.link
    linkItem.title.value = props.selection.text
  }
  fetchInternalItems()
  fetchFiles()
})
</script>

<template>
  <VCard
    :title="false"
    class="card"
  >
    <div class="input-group">
      <label for="link-modal-url-input">URL</label>
      <input
        id="link-modal-url-input"
        v-model="linkItem.url.value"
        class="card-input"
        type="text"
        placeholder="https://..."
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
      <legend>Link Style</legend>
      <div
        v-for="style in visibleLinkStyles"
        :key="style.name"
        class="input-radio"
      >
        <label :for="`link-modal-display-${style.name}`">{{ style.label }}</label>
        <input
          :id="`link-modal-display-${style.name}`"
          v-model="linkItem.type.value"
          type="radio"
          class="card-radio"
          name="link-display"
          :value="style.name"
        >
      </div>
    </fieldset>

    <!-- Internal collection search (link modal only) -->
    <template v-if="type === 'link'">
      <div class="input-group">
        <h2>Or pick from content</h2>
        <input
          v-model="q"
          class="card-input"
          type="text"
          placeholder="Search…"
          @input="onSearch"
        >
      </div>
      <div v-if="availableLangs.length > 1" class="lang-filter">
        <button
          :class="{ 'lang-active': selectedLang === null }"
          @click="selectedLang = null"
        >
          All
        </button>
        <button
          v-for="lang in availableLangs"
          :key="lang"
          :class="{ 'lang-active': selectedLang === lang }"
          @click="selectedLang = lang"
        >
          {{ lang }}
        </button>
      </div>
      <ul class="list">
        <li
          v-for="item in internalItems"
          :key="`${item._collection}-${item.id}-${item.langCode}`"
          class="list-item"
        >
          <button
            class="list-item-button"
            @click="selectInternalItem(item)"
          >
            <span class="list-item-headline">{{ item.title }}</span>
            <span class="list-item-type">{{ item.langCode ?? item._collection }}</span>
          </button>
        </li>
        <li v-if="!internalItems.length" class="list-empty">
          No results
        </li>
      </ul>
    </template>

    <!-- File browser (file modal only) -->
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
          <VButton :x-small="true" @click="onFileUpload">
            Upload
          </VButton>
        </div>
      </div>
      <ul v-if="files.length" class="list">
        <li
          v-for="file in files"
          :key="file.id"
          class="list-item"
        >
          <button class="list-item-button" @click="selectFile(file)">
            <span class="list-item-headline" :title="file.title">{{ file.title }}</span>
            <span class="list-item-type">{{ file.type }}</span>
          </button>
        </li>
      </ul>
    </template>

    <div class="footer">
      <VButton :x-small="true" :outlined="true" @click="emit('cancel')">
        Cancel
      </VButton>
      <VButton :x-small="true" @click="emit('setLink', linkItem)">
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

.list-empty {
  color: var(--theme--foreground-subdued);
  font-size: 0.875em;
  text-align: center;
  padding: 0.5rem;
}

.list-item { text-align: left; }

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

.list-item-button:hover { color: var(--theme--primary); }

.list-item:not(:last-child) { border-bottom: 1px solid grey; }

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
  border: none;
  padding: 0;
  margin-top: 1rem;
}

.input-radio {
  display: flex;
  flex-direction: row-reverse;
  gap: 0.25rem;
}

.lang-filter {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.75rem;
}

.lang-filter button {
  font-size: 0.75em;
  padding: 2px 8px;
  border: 1px solid var(--theme--border-color, #ccc);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  color: var(--theme--foreground-subdued);
}

.lang-filter button.lang-active {
  background: var(--theme--primary);
  border-color: var(--theme--primary);
  color: #fff;
}

.footer {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}
</style>
