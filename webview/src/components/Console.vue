<template>
    <div>
        <div ref="terminal"></div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

declare var $: any 

@Component
export default class Console extends Vue {

    private $terminal: any 

    mounted() {
        this.$terminal = $(this.$refs.terminal).terminal(function(command) {
            this.echo(command)
            if (command) {
                this.$bus.invoke('serial', 'write', command)
            }
        }, {
            greetings: 'JavaScript Interpreter',
            height: "100%" ,
            prompt: 'js> '
        })

        this.$bus.on("usb-data", (data:any)=>{
            this.$terminal.echo(data)
        })
    }
}
</script>