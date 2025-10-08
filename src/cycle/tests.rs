use super::*;
use crate::{memory::Memory, parser, reasoning::Reasoner};

#[test]
fn test_select_focus_set_priority() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // Create tasks with different priorities
    let mut task1 = parser::parse("task1.", &mut memory).unwrap();
    task1.priority = 0.2;
    let mut task2 = parser::parse("task2.", &mut memory).unwrap();
    task2.priority = 0.8;
    let mut task3 = parser::parse("task3.", &mut memory).unwrap();
    task3.priority = 0.5;

    memory.add_task(task1);
    memory.add_task(task2);
    memory.add_task(task3);

    let cycle = Cycle::new(&mut memory, &reasoner);
    let focus_set = cycle.select_focus_set();

    // Verify that the highest priority task is selected first
    assert_eq!(focus_set.len(), 3);
    assert_eq!(focus_set[0].term.name, "task2");
    assert_eq!(focus_set[1].term.name, "task3");
    assert_eq!(focus_set[2].term.name, "task1");
}

#[test]
fn test_select_focus_set_limited_by_size() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // Create more tasks than the FOCUS_SET_SIZE
    for i in 0..FOCUS_SET_SIZE + 5 {
        let mut task = parser::parse(&format!("task{}.", i), &mut memory).unwrap();
        task.priority = (i as f64) / 10.0;
        memory.add_task(task);
    }

    let cycle = Cycle::new(&mut memory, &reasoner);
    let focus_set = cycle.select_focus_set();

    // Verify that the focus set is capped at FOCUS_SET_SIZE
    assert_eq!(focus_set.len(), FOCUS_SET_SIZE);
    // The highest priority task should be task9
    assert_eq!(focus_set[0].term.name, format!("task{}", FOCUS_SET_SIZE + 4));
}

#[test]
fn test_cycle_adds_derived_task_to_memory() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // Setup premises for a syllogism
    let premise1 = parser::parse("(cat --> mammal).", &mut memory).unwrap();
    memory.add_task(premise1);
    let premise2 = parser::parse("(mammal --> animal).", &mut memory).unwrap();
    memory.add_task(premise2);

    // Run the cycle
    let mut cycle = Cycle::new(&mut memory, &reasoner);
    cycle.run_cycle();

    // Verify that the conclusion was added to memory
    let conclusion_term = parser::parse("(cat --> animal).", &mut memory).unwrap().term;
    let conclusion_from_mem = memory.get_task(&conclusion_term.hash);
    assert!(
        conclusion_from_mem.is_some(),
        "The derived conclusion should be in memory after the cycle."
    );
    assert_eq!(conclusion_from_mem.unwrap().term.hash, conclusion_term.hash);
}