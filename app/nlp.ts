import model from "wink-eng-lite-web-model";
import winkNLP from "wink-nlp";

export const nlp = winkNLP(model);
// Obtain "its" helper to extract item properties.
export const its = nlp.its;
// Obtain "as" reducer helper to reduce a collection.
export const as = nlp.as;
