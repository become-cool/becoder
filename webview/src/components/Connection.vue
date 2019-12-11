<template>
    <div>
        <div>
            USB串口: 
            <select v-model="$state.usb.active.path">
                <option v-for="port in $state.usb.list">{{port.path}}</option>
            </select>
            <button @click="refreshSerialPorts">刷新</button>

            <button v-show="!$state.usb.active.isOpen" @click="connectSerialPort">连接</button>
            <button v-show="$state.usb.active.isOpen" @click="closeSerialPort">断开</button>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Provide, Vue } from 'vue-property-decorator';


declare module 'vue/types/vue' {
    interface Vue {
      $bus: any ,
      $state: any
    }
  }

@Component({components:{  }})
export default class Connection extends Vue {

    mounted () {
        this.$bus.on("usb-open", ()=>{
            console.log("usb-open")
            this.$state.usb.active.isOpen = true
        })
        this.$bus.on("usb-close", ()=>{
            console.log("usb-close")
            this.$state.usb.active.isOpen = false
        })
        this.$bus.on("usb-error", ()=>{
            console.log("usb-error")
        })
    }

    async refreshSerialPorts() {
        this.$state.usb.list = await this.$bus.invoke("serial", "list")
        if(this.$state.usb.list.length) {
            this.$state.usb.active.path = this.$state.usb.list[0].path
        }
    }

    connectSerialPort() {
        if(this.$state.usb.active.path)
            this.$bus.invoke("serial", "open", this.$state.usb.active.path)
    }
    closeSerialPort() {
        this.$bus.invoke("serial", "close")
    }
}
</script>