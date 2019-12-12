declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

declare var $: any 
declare module 'vue/types/vue' {
    interface Vue {
        $bus: any ,
        $state: any
    }
}