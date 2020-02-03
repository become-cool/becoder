<template>
    <div>
        <div ref="terminal" lfttop rgtbtm></div>
    </div>
</template>

<script>

function array2string(array) {
    var string = ""
    for(var char of array) {
        string+= String.fromCharCode(char)
    }
    return string
}

export default {

    mounted() {
        const self = this
        this.$terminal = window.$(this.$refs.terminal).terminal(function(command) {

            if( !self.$state.usb.active.isOpen ) {
                this.echo("Not connected to dev yet")
                return
            }
            
            // this.echo(command)
            if (command) {
                self.$bus.invoke('serial', 'write', command+"\n")
            }
        }, {
            greetings: 'JavaScript Interpreter',
            height: "100%" ,
            prompt: "JS> "
        })

        this.$bus.on("usb-data", (msg)=>{
            this.$terminal.echo(array2string(msg.data.data))
        })
        this.$bus.on("echo", (msg)=>{
            this.$terminal.echo(msg.data)
        })   
        this.$bus.on("usb-open", ()=>{
            this.$terminal.echo("已经通过USB连接到设备.")
        })   
        this.$bus.on("usb-close", ()=>{
            this.$terminal.echo("设备已经从USB上断开.")
        })
    }
}
</script>