<script>
import VuePoll from 'vue-poll'
export default {
  props: ["question", "answers"],
  name: "voting",
  data() {
    return {
      displayAnswers: false,
      // options: {
      //   question: 'What\'s your favourite <strong>JS</strong> framework?',
      //   answers: [
      //     { value: 1, text: 'Vue', votes: 53 },
      //     { value: 2, text: 'React', votes: 35 },
      //     { value: 3, text: 'Angular', votes: 30 },
      //     { value: 4, text: 'Other', votes: 10 }
      //   ]
      // }
    }
  },
  components: {
    VuePoll
  },
}
</script>

<template>
  <div>
    <vue-poll :answers="answers" :question="question" :show-results="displayAnswers" />
  </div>
</template>

<style scoped>

</style>
