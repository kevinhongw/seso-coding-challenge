"use strict";

const { MinPriorityQueue } = require('@datastructures-js/priority-queue');

const DEFAULT_MAX_HEAP_SIZE = 100000;
const getLogEntryValue = ({ logEntry }) => logEntry.date;

module.exports = async (logSources, printer, maxHeapSize = DEFAULT_MAX_HEAP_SIZE) => {
  // heap item shape: { logEntry: { date: Date, msg: string}, logSourceIndex: string }
  const minHeap = new MinPriorityQueue(getLogEntryValue);

  // keep track of each log sources' "inventory"
  const logSourceUnusedLogCount = [...Array(logSources.length)].map(() => 0);

  // Maintain set of undrained log sources. This will increase performance. 
  const undrainedLogSourceSet = new Set(logSources.map((_, index) => index));

  async function enqueueLogEntryBySourceIndex(logSourceIndex) {
    const logEntry = await logSources[logSourceIndex].popAsync();

    if (logEntry) {
      minHeap.enqueue({ logEntry, logSourceIndex });
      logSourceUnusedLogCount[logSourceIndex]++;
    } else {
      undrainedLogSourceSet.delete(logSourceIndex);
    }
  }

  async function fetchNextLogEntriesBatch() {
    // Ensure the space doesn't go out of control
    if (minHeap.size() > maxHeapSize) {
      return;
    }

    const promises = [];
    for (const index of undrainedLogSourceSet.values()) {
      promises.push(enqueueLogEntryBySourceIndex(index))
    }
    
    return Promise.all(promises);
  }

  // initial run to ensure each source has at least one log fetched
  await fetchNextLogEntriesBatch();

  while (!minHeap.isEmpty()) {
    const { logEntry, logSourceIndex } = minHeap.dequeue();
    logSourceUnusedLogCount[logSourceIndex]--;

    printer.print(logEntry);

    // Make sure there's at least one entry fetched from the source.
    // So we dont need to worry about print speed > fetch speed (especially when heap size is small)
    while (!logSources[logSourceIndex].drained && logSourceUnusedLogCount[logSourceIndex] <= 0) {
      await enqueueLogEntryBySourceIndex(logSourceIndex);
    }

    await fetchNextLogEntriesBatch();
  }

  printer.done();

  return console.log("Async sort complete.")
};
