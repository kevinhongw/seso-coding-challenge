"use strict";

const { MinPriorityQueue } = require('@datastructures-js/priority-queue');

// Print all entries, across all of the sources, in chronological order.

const getLogEntryValue = ({ logEntry }) => logEntry.date;

module.exports = (logSources, printer) => {
  const minHeap = new MinPriorityQueue(getLogEntryValue);

  function enqueueLogEntryBySourceIndex(logSourceIndex) {
    const logEntry = logSources[logSourceIndex].pop();

    // logEntry could be false if drained
    if (logEntry) {
      minHeap.enqueue({ logEntry, logSourceIndex });
    }
  }

  // Initialize min heap with first entry of each log source
  for (let i = 0; i < logSources.length; i++) {
    enqueueLogEntryBySourceIndex(i);
  }

  while(!minHeap.isEmpty()) {
    const { logEntry, logSourceIndex } = minHeap.dequeue();

    printer.print(logEntry);

    if (!logSources[logSourceIndex].drained) {
      enqueueLogEntryBySourceIndex(logSourceIndex);
    }
  }

  printer.done();
	
  return console.log("Sync sort complete.");
};
