<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import LucideIcon from './LucideIcon.vue';
import { readData, storageError, updateData } from '../lib/db';
import { validQuizAnswers } from '../lib/model';

interface Question {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanations: string[];
  url: string;
}

const props = defineProps<{ id: string; questions: Question[] }>();
const answers = ref<number[]>(props.questions.map(() => -1));
const submitted = ref(false);
const error = ref('');
const score = computed(() => Math.round(props.questions.filter((question, index) => answers.value[index] === question.answer).length / props.questions.length * 100));

onMounted(async () => {
  try {
    const data = await readData();
    const previous = data.quizzes[props.id];
    if (previous && validQuizAnswers(previous.answers, props.questions.map((question) => question.options.length))) {
      answers.value = previous.answers;
      submitted.value = true;
    }
  } catch (cause) {
    error.value = storageError(cause);
  }
});

async function submit() {
  if (answers.value.some((answer) => answer < 0)) {
    error.value = 'Jawab setiap pertanyaan sebelum memeriksa hasil.';
    return;
  }
  try {
    await updateData((data) => {
      data.quizzes[props.id] = { answers: [...answers.value], score: score.value, updatedAt: new Date().toISOString() };
    });
    submitted.value = true;
    error.value = '';
  } catch (cause) {
    error.value = storageError(cause);
  }
}
</script>

<template>
  <form class="quiz" @submit.prevent="submit">
    <fieldset v-for="(question, index) in questions" :key="question.id">
      <legend>{{ index + 1 }}. {{ question.question }}</legend>
      <label v-for="(option, optionIndex) in question.options" :key="optionIndex" class="check-row">
        <input v-model="answers[index]" type="radio" :name="id + '-' + question.id" :value="optionIndex" @change="submitted = false">
        <span>{{ option }}</span>
      </label>
      <div v-if="submitted" class="feedback">
        <strong class="feedback-title">
          <LucideIcon :name="answers[index] === question.answer ? 'circle-check' : 'info'" :size="17" />
          <span>{{ answers[index] === question.answer ? 'Benar' : 'Perlu ditinjau' }} — {{ question.options[question.answer] }}</span>
        </strong>
        <ul>
          <li v-for="(reason, reasonIndex) in question.explanations" :key="reasonIndex">{{ question.options[reasonIndex] }}: {{ reason }}</li>
        </ul>
        <a class="inline-icon-link" :href="question.url">
          <span>Pelajari kembali konsepnya</span>
          <LucideIcon name="arrow-right" :size="15" />
        </a>
      </div>
    </fieldset>

    <button class="primary" type="submit">
      <LucideIcon name="circle-check" :size="17" />
      <span>Periksa jawaban</span>
    </button>
    <p v-if="submitted" role="status">Hasil: {{ score }}%. Tinjau alasan setiap pilihan sebelum melanjutkan.</p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
  </form>
</template>
