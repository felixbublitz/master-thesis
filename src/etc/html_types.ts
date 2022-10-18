export class DomElement{
    static BT_INIT_CALL= "btn-init-call";
    static BT_INIT_APP= "btn-init-app";
    static BT_EXPORT = "btn-export";
    static SL_VIDEO_MODE = "video-mode";
    static UL_PEER_ITEMS = "peer-videos";
    private static PREFIX_PEER_ITEM = "peer-item-";
    private static PREFIX_PEER_STATS = "peer-stats-";
    private static PREFIX_PEER_CONTENT = "peer-content-";

    static peerItem(id : number){
        return this.PREFIX_PEER_ITEM + id;
    }

    static peerContent(id : number){
        return this.PREFIX_PEER_CONTENT + id;
    }

    static peerStats(id : number){
        return this.PREFIX_PEER_STATS + id;
    }
}