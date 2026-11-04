export const COCO_CLASSES = ["person","bicycle","car","motorcycle","airplane","bus","train","truck","boat","traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat","dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack","umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball","kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket","bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple","sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair","couch","potted plant","bed","dining table","toilet","tv","laptop","mouse","remote","keyboard","cell phone","microwave","oven","toaster","sink","refrigerator","book","clock","vase","scissors","teddy bear","hair drier","toothbrush"];

/** French labels for display. */
export const LABELS_FR: Record<string, string> = {
  bottle: "Bouteille", person: "Personne", cup: "Tasse", "wine glass": "Verre à vin", "cell phone": "Téléphone",
  laptop: "Ordinateur portable", book: "Livre", chair: "Chaise", vase: "Vase", bowl: "Bol", keyboard: "Clavier",
  mouse: "Souris", remote: "Télécommande", clock: "Horloge", scissors: "Ciseaux", tv: "Télévision",
  "dining table": "Table", cat: "Chat", dog: "Chien", car: "Voiture", banana: "Banane", apple: "Pomme", orange: "Orange",
};
export const frLabel = (l: string) => LABELS_FR[l] ?? l;
