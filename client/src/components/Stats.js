// Stats page (§29) — two D3.js charts fed LIVE from MongoDB via the API:
//   1. Bar chart:  posts per group
//   2. Line chart: posts per day (last 30 days)
// Reload the page after posting and the numbers change — nothing is hard-coded.
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { api, ajaxError } from '../api';

const WIDTH = 640;
const HEIGHT = 300;
const MARGIN = { top: 20, right: 20, bottom: 70, left: 45 };

function drawBarChart(svgEl, data) {
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove(); // clear previous render

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.name))
    .range([MARGIN.left, WIDTH - MARGIN.right])
    .padding(0.3);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count) || 1])
    .nice()
    .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

  // Axes
  svg
    .append('g')
    .attr('transform', `translate(0,${HEIGHT - MARGIN.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-20)')
    .style('text-anchor', 'end');
  svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')));

  // Bars
  svg
    .selectAll('rect.bar')
    .data(data)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', (d) => x(d.name))
    .attr('y', (d) => y(d.count))
    .attr('width', x.bandwidth())
    .attr('height', (d) => y(0) - y(d.count))
    .attr('rx', 4)
    .attr('fill', '#4f46e5');

  // Count labels on top of each bar
  svg
    .selectAll('text.value')
    .data(data)
    .join('text')
    .attr('class', 'value')
    .attr('x', (d) => x(d.name) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.count) - 6)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .attr('fill', '#65676b')
    .text((d) => d.count);
}

function drawLineChart(svgEl, rows) {
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const parseDay = d3.timeParse('%Y-%m-%d');
  const data = rows.map((r) => ({ date: parseDay(r._id), count: r.count }));

  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date))
    .range([MARGIN.left, WIDTH - MARGIN.right]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count) || 1])
    .nice()
    .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

  svg
    .append('g')
    .attr('transform', `translate(0,${HEIGHT - MARGIN.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%d/%m')));
  svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')));

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.count))
    .curve(d3.curveMonotoneX);

  svg
    .append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#4f46e5')
    .attr('stroke-width', 2.5)
    .attr('d', line);

  // A dot per day
  svg
    .selectAll('circle.pt')
    .data(data)
    .join('circle')
    .attr('class', 'pt')
    .attr('cx', (d) => x(d.date))
    .attr('cy', (d) => y(d.count))
    .attr('r', 4)
    .attr('fill', '#4f46e5');
}

function Stats() {
  const barRef = useRef(null);
  const lineRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [perGroup, perDay] = await Promise.all([
          api('GET', '/api/stats/posts-per-group'),
          api('GET', '/api/stats/posts-per-day'),
        ]);
        if (perGroup.length === 0 && perDay.length === 0) setEmpty(true);
        if (perGroup.length > 0) drawBarChart(barRef.current, perGroup);
        if (perDay.length > 0) drawLineChart(lineRef.current, perDay);
      } catch (err) {
        setMsg(ajaxError(err, 'Could not load statistics.'));
      }
    })();
  }, []);

  return (
    <main className="content">
      <div className="msg">{msg}</div>
      {empty && (
        <div className="card muted">No data yet — write some posts and come back!</div>
      )}

      <div className="card">
        <h3>Posts per group</h3>
        <p className="muted">Live count of posts in every group you can see.</p>
        <svg ref={barRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%' }} />
      </div>

      <div className="card">
        <h3>Posts per day — last 30 days</h3>
        <p className="muted">How active the network has been, day by day.</p>
        <svg ref={lineRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%' }} />
      </div>
    </main>
  );
}

export default Stats;
