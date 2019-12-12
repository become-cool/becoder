import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false


Vue.use({
  install(Vue) {
      Vue.prototype.$bus = window.$bus
      Vue.prototype.$state = window.$state
  }
})

new Vue({
  render: h => h(App),
  mounted() {
    setTimeout(()=>{
        new window.Anchor9().init()
        console.log("mounted")
    },0)
  }
}).$mount('#app')
