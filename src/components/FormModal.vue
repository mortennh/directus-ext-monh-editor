<script setup lang="ts">
import { useApi } from '@directus/extensions-sdk'
import { onMounted, ref } from 'vue'

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'setForm', payload: object): void
}>()

const api = useApi()
const forms = ref([])
const selection = ref(null)

async function fetchForms() {
  try {
    const response = await api.get('/items/forms', {
      params: {
        fields: [
          'id',
          'title',
        ],
      },
    })
    forms.value = response.data.data
  }
  catch (error) {
    console.error('Error fetching forms:', error)
  }
}

onMounted(() => {
  fetchForms()
})
</script>

<template>
  <VCard
    :title="false"
    class="card"
  >
    <ul
      v-if="forms.length"
      class="list"
    >
      <li
        v-for="item in forms"
        :key="`form-modal-select-item-${item.id}`"
        class="list-item"
        style="--v-button-width: 100%"
      >
        <button
          class="list-item-button"
          @click="selection = item"
        >
          <span class="list-item-headline">{{ item.title }}</span>
        </button>
      </li>
    </ul>

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
        @click="emit('setForm', selection)"
      >
        add Form
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

.footer {
  display: flex;
  justify-content: space-between;
}
</style>
