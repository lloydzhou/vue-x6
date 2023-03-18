<template>
  <el-progress type="dashboard" :percentage="percentage" :width="80">
    <template #default="{ percentage }">
      <span class="percentage-value">{{ percentage }}%</span>
    </template>
  </el-progress>
</template>

<script lang="ts">
  import { defineComponent } from "vue";

  export default defineComponent({
    name: "ProgressNode",
    inject: ["getNode"],
    data() {
      return {
        percentage: 80,
      };
    },
    mounted() {
      const node = (this as any).getNode();
      console.log(node);
    },
  });
</script>
