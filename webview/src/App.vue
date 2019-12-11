<template>
  <div id="app" lfttop="window" rgtbtm="window">
    <Connection lfttop="parent" rgttop="parent" />
    <Console/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Console from './components/Console.vue';
import Connection from './components/Connection.vue';

@Component({
  components: {
    Console, Connection
  },
})
export default class App extends Vue {}
</script>
