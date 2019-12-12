<template>
    <div>
        <div>
            USB串口: 
            <select v-model="usb.active.path">
                <option v-for="port in usb.list">{{port.path}}</option>
            </select>
            <button @click="refreshSerialPorts">刷新</button>

            <button v-show="!usb.active.isOpen" @click="connectSerialPort" style="color:green">连接</button>
            <button v-show="usb.active.isOpen" @click="closeSerialPort" style="color:red">断开</button>
        </div>

        <div style="width: 200px" rgt=":-10">
            <button :disabled="!usb.active.isOpen" @click="runInWiFi('process.memory()')">Memory</button>
            <button :disabled="!usb.active.isOpen" @click="runInWiFi('reset()')">Reset</button>
        </div>
    </div>
</template>

<script>
export default {


    data () {
        return {
            usb: this.$state.usb
        }
    } ,

    mounted () {
        this.$bus.on("usb-open", ()=>{
            console.log("usb-open")
            this.usb.active.isOpen = true
        })
        this.$bus.on("usb-close", ()=>{
            console.log("usb-close")
            this.usb.active.isOpen = false
        })
        this.$bus.on("usb-error", ()=>{
            console.log("usb-error")
        })
    } ,

    methods: {
        async refreshSerialPorts() {
            this.usb.list = await this.$bus.invoke("serial", "list")
            if(this.usb.list.length) {
                this.usb.active.path = this.usb.list[0].path
            }
        } ,

        connectSerialPort() {
            if(this.usb.active.path)
                this.$bus.invoke("serial", "open", this.usb.active.path)
        } ,
        closeSerialPort() {
            this.$bus.invoke("serial", "close")
        } ,
        runInWiFi(code) {
            this.$bus.invoke("serial", "write", code+"\n")
        }

    }
}
</script>