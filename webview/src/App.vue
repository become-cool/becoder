<template>
  <div id="app" lfttop="window" rgtbtm="window">
    <Connection lfttop="parent" rgttop="parent" />
    <Console lfttop="prev.lftbtm" rgtbtm="parent" />
  </div>
</template>

<script>
import Console from './components/Console.vue';
import Connection from './components/Connection.vue';

export default {
  components: {
    Console, Connection
  },
}
</script>
