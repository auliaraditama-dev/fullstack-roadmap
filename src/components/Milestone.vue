<script setup lang="ts">
import {ref,onMounted} from 'vue';import{readData,updateData,storageError}from'../lib/db';
const props=defineProps<{id:string;items:string[];kind?:'milestones'|'exercises'}>();const values=ref<Record<string,boolean>>({}),error=ref(''),ready=ref(false);
onMounted(async()=>{try{values.value=(await readData())[props.kind??'milestones'];ready.value=true;}catch(e){error.value=storageError(e);}});
async function toggle(i:number,e:Event){const input=e.target as HTMLInputElement;const v=input.checked;input.disabled=true;try{await updateData(d=>{d[props.kind??'milestones'][props.id+':'+i]=v;});values.value[props.id+':'+i]=v;error.value='';}catch(e){input.checked=values.value[props.id+':'+i]===true;error.value=storageError(e);}finally{input.disabled=false;}}
</script>
<template><div class="milestones"><label v-for="(item,i) in items" :key="i" class="check-row"><input type="checkbox" :disabled="!ready" :checked="values[id+':'+i]" @change="toggle(i,$event)">{{item}}</label><p v-if="error" role="alert">{{error}}</p></div></template>
