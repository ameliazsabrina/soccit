import { getParticipationsCollection } from "../../mongo.js";
import { participationOutput, type Participation } from "./participation.schema.js";

export async function getUserMatches(wallet: string): Promise<Participation[]> {
  const docs = await (await getParticipationsCollection())
    .find({ wallet })
    .sort({ _updatedAt: -1 })
    .toArray();
  return docs.map((doc) => participationOutput.parse(doc));
}
