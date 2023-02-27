<script setup lang="ts">
import { ref } from 'vue'
import { Snapline } from "@antv/x6-plugin-snapline";
// @ts-ignore
import { Graph, Node, Edge, ElementOfPlugin } from 'vue-x6'
const click = (e: any) => {
  console.log(e)
}
const SnaplinePlugin = ElementOfPlugin('Snapline', Snapline)
const visible = ref(true)
const toggle = () => visible.value = !visible.value
</script>

<template>
  <button @click="toggle">显示/隐藏node2</button>
  <Graph grid>
    <SnaplinePlugin key="Snapline" />
    <Node id="1" label="node1" :x="100" :y="100" :width="80" :height="40" @click="click" />
    <Node id="2" label="node2" :x="200" :y="200" :width="80" :height="40" @click="click" v-if="visible" />
    <Node id="3" label="node3" :x="200" :y="100" :width="80" :height="40" parent="1" @click="click" />
    <Edge source="1" target="2" @click="click" />
  </Graph>
</template>

