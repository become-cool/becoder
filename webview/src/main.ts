import Vue from 'vue'
import App from './App.vue'

declare var $bus: any
declare var $state: any
declare class Anchor9 {
    public init() :any
}

Vue.config.productionTip = false

Vue.use({
    install(Vue) {
        Vue.prototype.$bus = $bus
        Vue.prototype.$state = $state
    }
})

new Vue({
    render: h => h(App),
    mounted() {
        setTimeout(()=>{
            new Anchor9().init()
            console.log("mounted")
        },0)
    }
}).$mount('#app')