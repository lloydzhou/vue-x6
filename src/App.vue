<script setup lang="ts">
// @ts-nocheck
import { ref } from 'vue'
import { Snapline } from "@antv/x6-plugin-snapline";
import { Graph, Node, Edge, ElementOfPlugin } from 'vue-x6'
import { SourceMarker, TargetMarker } from 'vue-x6'
import { Label, EdgeTool, NodeTool, PortGroup, Port } from 'vue-x6'
import { register, getTeleport } from "@antv/x6-vue-shape";
import ProgressNode from "./ProgressNode.vue";

register({
  shape: "custom-vue-node",
  width: 100,
  height: 100,
  component: ProgressNode,
});
const TeleportContainer = getTeleport();

const click = (e: any) => {
  console.log(e)
}
const SnaplinePlugin = ElementOfPlugin('Snapline', Snapline)
const visible = ref(true)
const toggle = () => visible.value = !visible.value
const nodes = [1,2,3,4,5].map(i => ({id: `id:${i}`, label: `node:${i}`, x: 250 + i * 50, y: 200 + i * 50}))
</script>

<template>
  <TeleportContainer />
  <button @click="toggle">显示/隐藏node2</button>
  <Graph grid>
    <SnaplinePlugin key="Snapline" />
    <Node id="1" label="node1" :x="100" :y="100" :width="80" :height="40" @click="click" >
      <PortGroup name="group1" :position='{name: "top"}' />
      <PortGroup name="group2" :position='{name: "bottom"}' />
      <Port :group="`group${Math.ceil(i/2)}`" :id="`port${i}`" v-for="i in [1,2,3,4]" />
    </Node>
    <Node id="2" label="node2" :x="200" :y="200" :width="80" :height="40" @click="click" v-if="visible" />
    <Node id="3" label="node3" :x="200" :y="100" :width="80" :height="40" parent="1" @click="click" />
    <Edge v-if="visible" source="1" target="2" @click="click">
      <Label :attrs='{text: {text: "Hello Label1"}}' :position='{distance: 0.3}' />
      <Label :attrs='{text: {text: "Hello Label3"}}' :position='{distance: 0.5}' />
      <Label :attrs='{text: {text: "Hello Label2"}}' :position='{distance: 0.7}' />
      <SourceMarker name="diamond" />
      <TargetMarker name="ellipse" />
    </Edge>
    <Node id="100" label="path" :x="400" :y="200" :width="80" :height="80" shape="path" path="M 0 5 10 0 C 20 0 20 20 10 20 L 0 15 Z" :attrs="{body: {fill: '#efdbff', stroke: '#9254de'}}" />
    <Node shape="custom-vue-node" :x="400" :y="100" />
    <Node :id="node.id" :label="node.label" :x="node.x" :y="node.y" :width="100" :height="40" v-for="node in nodes" />
    <Node :id="node.id + 100" :label="node.label + 100" :x="node.x" :y="node.y" :width="100" :height="40" v-for="node in nodes" />
  </Graph>
</template>

